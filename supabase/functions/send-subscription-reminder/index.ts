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
    const { tenant_id, tenant_name, expires_at, reminder_type = "expiring_soon" } = await req.json();

    if (!tenant_id || !tenant_name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: tenant_id, tenant_name",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tenant admins
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("tenant_id", tenant_id)
      .eq("role", "admin")
      .eq("is_active", true);

    if (!admins || admins.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No active admins found for tenant",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Calculate days remaining
    let daysRemaining = 0;
    if (expires_at) {
      const expiryDate = new Date(expires_at);
      const today = new Date();
      daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Prepare email content based on reminder type
    let subject = "";
    let messageEn = "";
    let messageAr = "";

    switch (reminder_type) {
      case "expiring_soon":
        subject = `Subscription Expiring Soon - ${tenant_name}`;
        messageEn = `Your subscription for ${tenant_name} will expire in ${daysRemaining} days on ${new Date(expires_at).toLocaleDateString()}. Please renew your subscription to continue using the service without interruption.`;
        messageAr = `سينتهي اشتراككم في ${tenant_name} خلال ${daysRemaining} يوم في ${new Date(expires_at).toLocaleDateString()}. يرجى تجديد الاشتراك لمواصلة استخدام الخدمة دون انقطاع.`;
        break;

      case "expired":
        subject = `Subscription Expired - ${tenant_name}`;
        messageEn = `Your subscription for ${tenant_name} has expired. Please renew your subscription to continue using the service.`;
        messageAr = `انتهى اشتراككم في ${tenant_name}. يرجى تجديد الاشتراك لمواصلة استخدام الخدمة.`;
        break;

      case "grace_period":
        subject = `Grace Period Active - ${tenant_name}`;
        messageEn = `Your subscription for ${tenant_name} has expired and you are currently in the grace period. Please renew your subscription as soon as possible.`;
        messageAr = `انتهى اشتراككم في ${tenant_name} وأنتم حالياً في فترة السماح. يرجى تجديد الاشتراك في أقرب وقت ممكن.`;
        break;

      case "trial_ending":
        subject = `Trial Period Ending Soon - ${tenant_name}`;
        messageEn = `Your trial period for ${tenant_name} will end in ${daysRemaining} days. Please upgrade to a paid plan to continue using the service.`;
        messageAr = `ستنتهي الفترة التجريبية لـ ${tenant_name} خلال ${daysRemaining} يوم. يرجى الترقية إلى خطة مدفوعة لمواصلة استخدام الخدمة.`;
        break;

      default:
        messageEn = `This is a reminder regarding your subscription for ${tenant_name}.`;
        messageAr = `هذا تذكير بخصوص اشتراككم في ${tenant_name}.`;
    }

    // Create notifications for all admins
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      type: "system_alert",
      title: subject,
      title_ar: subject,
      message: messageEn,
      message_ar: messageAr,
      created_at: new Date().toISOString(),
    }));

    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Error creating notifications:", notifError);
    }

    // Send emails (if email service is configured)
    // This would integrate with your email service
    // For now, we just log it
    console.log(`Subscription reminder sent for tenant ${tenant_name}:`, {
      reminder_type,
      expires_at,
      days_remaining: daysRemaining,
      admins_notified: admins.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        tenant_name,
        reminder_type,
        admins_notified: admins.length,
        notifications_created: notifications.length,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in send-subscription-reminder:", error);
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
