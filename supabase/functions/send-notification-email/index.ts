import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  type: string;
  relatedTaskId?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, title, titleAr, message, messageAr, type, relatedTaskId }: NotificationRequest = await req.json();

    console.log("Processing notification for user:", userId);

    // Get user profile and preferences
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Failed to fetch user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get notification preferences
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    const shouldSendEmail = preferences?.email_enabled ?? true;
    const shouldCreateInApp = preferences?.in_app_enabled ?? true;

    // Create in-app notification
    if (shouldCreateInApp) {
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title,
          title_ar: titleAr,
          message,
          message_ar: messageAr,
          type,
          related_task_id: relatedTaskId,
        });

      if (notifError) {
        console.error("Failed to create notification:", notifError);
      } else {
        console.log("In-app notification created successfully");
      }
    }

    // Send email notification
    if (shouldSendEmail && profile.email) {
      try {
        const emailResponse = await resend.emails.send({
          from: "Mutqan CMMS <notifications@resend.dev>",
          to: [profile.email],
          subject: title,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🔔 ${title}</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  ${message}
                </p>
                ${relatedTaskId ? `
                  <a href="${supabaseUrl.replace('https://', 'https://app.')}/maintenance" 
                     style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 6px; font-weight: 600;">
                    عرض التفاصيل
                  </a>
                ` : ''}
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  هذا إشعار تلقائي من نظام Mutqan CMMS. يرجى عدم الرد على هذا البريد الإلكتروني.
                </p>
              </div>
            </div>
          `,
        });

        console.log("Email sent successfully:", emailResponse);
      } catch (emailError: any) {
        console.error("Failed to send email:", emailError);
        // Don't fail the whole request if email fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification processed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});