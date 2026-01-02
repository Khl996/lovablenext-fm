import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const tenantsToUpdate: string[] = [];
    const tenantsToSuspend: string[] = [];
    const tenantsExpiredTrial: string[] = [];

    // 1. Check for expired trials
    const { data: expiredTrials } = await supabase
      .from("tenants")
      .select("id, name, trial_ends_at")
      .eq("subscription_status", "trial")
      .lt("trial_ends_at", today.toISOString());

    if (expiredTrials && expiredTrials.length > 0) {
      for (const tenant of expiredTrials) {
        await supabase
          .from("tenants")
          .update({
            subscription_status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("id", tenant.id);

        tenantsExpiredTrial.push(tenant.name);
      }
    }

    // 2. Check for expired active subscriptions
    const { data: expiredSubs } = await supabase
      .from("tenants")
      .select("id, name, subscription_ends_at, grace_period_days")
      .eq("subscription_status", "active")
      .lt("subscription_ends_at", today.toISOString());

    if (expiredSubs && expiredSubs.length > 0) {
      for (const tenant of expiredSubs) {
        // Move to suspended with grace period
        await supabase
          .from("tenants")
          .update({
            subscription_status: "suspended",
            grace_period_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", tenant.id);

        tenantsToSuspend.push(tenant.name);
      }
    }

    // 3. Check for expired grace periods
    const { data: expiredGrace } = await supabase
      .from("tenants")
      .select("id, name, grace_period_started_at, grace_period_days")
      .eq("subscription_status", "suspended")
      .not("grace_period_started_at", "is", null);

    if (expiredGrace && expiredGrace.length > 0) {
      for (const tenant of expiredGrace) {
        const graceStarted = new Date(tenant.grace_period_started_at);
        const graceEnd = new Date(
          graceStarted.getTime() + tenant.grace_period_days * 24 * 60 * 60 * 1000
        );

        if (graceEnd < today) {
          await supabase
            .from("tenants")
            .update({
              subscription_status: "expired",
              status: "suspended",
              suspended_at: new Date().toISOString(),
              suspension_reason: "Grace period expired",
              updated_at: new Date().toISOString(),
            })
            .eq("id", tenant.id);

          tenantsToUpdate.push(tenant.name);
        }
      }
    }

    // 4. Send reminders for subscriptions ending soon (7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: endingSoon } = await supabase
      .from("tenants")
      .select("id, name, email, subscription_ends_at")
      .eq("subscription_status", "active")
      .lt("subscription_ends_at", sevenDaysFromNow.toISOString())
      .gt("subscription_ends_at", today.toISOString());

    const reminders: string[] = [];
    if (endingSoon && endingSoon.length > 0) {
      for (const tenant of endingSoon) {
        // Call send-subscription-reminder function
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-subscription-reminder`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              tenant_id: tenant.id,
              tenant_name: tenant.name,
              expires_at: tenant.subscription_ends_at,
            }),
          });
          reminders.push(tenant.name);
        } catch (error) {
          console.error(`Failed to send reminder for ${tenant.name}:`, error);
        }
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      expired_trials: tenantsExpiredTrial.length,
      suspended: tenantsToSuspend.length,
      expired_grace: tenantsToUpdate.length,
      reminders_sent: reminders.length,
      details: {
        expired_trials: tenantsExpiredTrial,
        suspended: tenantsToSuspend,
        expired_grace: tenantsToUpdate,
        reminders: reminders,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in daily-subscription-check:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
