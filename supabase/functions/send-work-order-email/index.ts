import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  workOrderId: string;
  eventType: string;
  recipientEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workOrderId, eventType, recipientEmail }: EmailRequest = await req.json();
    
    console.log("Processing email notification:", { workOrderId, eventType, recipientEmail });

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("Fetching work order with ID:", workOrderId);

    // Fetch work order details
    const { data: workOrder, error: woError } = await supabase
      .from("work_orders")
      .select(`
        *,
        assets (name, name_ar),
        teams (name, name_ar)
      `)
      .eq("id", workOrderId)
      .maybeSingle();

    console.log("Work order fetch result:", { workOrder, woError });

    if (woError) {
      console.error("Database error fetching work order:", woError);
      throw new Error(`Database error: ${woError.message}`);
    }

    if (!workOrder) {
      console.error("Work order not found with ID:", workOrderId);
      throw new Error(`Work order not found with ID: ${workOrderId}`);
    }

    // Fetch reporter profile separately
    let reporterProfile = null;
    if (workOrder.reported_by) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", workOrder.reported_by)
        .maybeSingle();
      
      reporterProfile = profile;
      console.log("Reporter profile:", reporterProfile);
    }

    // Determine email subject and body based on event type
    let subject = "";
    let htmlContent = "";
    let toEmail = recipientEmail || reporterProfile?.email;
    let toEmails: string[] = [];

    // For new work orders, get team members' emails
    if (eventType === "new_work_order" && workOrder.assigned_team) {
      console.log("Fetching team members for team:", workOrder.assigned_team);
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", workOrder.assigned_team);

      console.log("Team members result:", { teamMembers, teamError });

      if (!teamError && teamMembers && teamMembers.length > 0) {
        const userIds = teamMembers.map(tm => tm.user_id);
        console.log("Fetching profiles for user IDs:", userIds);
        
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("email")
          .in("id", userIds);

        console.log("Profiles result:", { profiles, profilesError });

        if (!profilesError && profiles) {
          toEmails = profiles.map(p => p.email).filter(email => email);
          console.log("Team member emails found:", toEmails);
        }
      } else {
        console.log("No team members found for this team");
      }
    }

    switch (eventType) {
      case "new_work_order":
        subject = `بلاغ صيانة جديد ${workOrder.code}`;
        htmlContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif;">
            <h2>بلاغ صيانة جديد</h2>
            <p>تم إنشاء بلاغ صيانة جديد برقم: <strong>${workOrder.code}</strong></p>
            <p>نوع المشكلة: ${workOrder.issue_type}</p>
            <p>الوصف: ${workOrder.description}</p>
            <p>الأولوية: ${workOrder.priority}</p>
            <p>الجهاز: ${workOrder.assets?.name_ar || workOrder.assets?.name || "غير محدد"}</p>
            <p>المبلغ: ${reporterProfile?.full_name || "غير محدد"}</p>
            <p>يرجى المتابعة والعمل على هذا البلاغ في أقرب وقت ممكن.</p>
          </div>
        `;
        break;

      case "work_started":
        subject = `تم بدء العمل على الطلب ${workOrder.code}`;
        htmlContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif;">
            <h2>تم بدء العمل</h2>
            <p>تم بدء العمل على طلب الصيانة رقم: <strong>${workOrder.code}</strong></p>
            <p>الجهاز: ${workOrder.assets?.name_ar || workOrder.assets?.name || "غير محدد"}</p>
            <p>الفريق المعني: ${workOrder.teams?.name_ar || workOrder.teams?.name || "غير محدد"}</p>
          </div>
        `;
        break;

      case "work_completed":
        subject = `تم إكمال العمل على الطلب ${workOrder.code}`;
        htmlContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif;">
            <h2>تم إكمال العمل</h2>
            <p>تم إكمال العمل على طلب الصيانة رقم: <strong>${workOrder.code}</strong></p>
            <p>الجهاز: ${workOrder.assets?.name_ar || workOrder.assets?.name || "غير محدد"}</p>
            <p>يرجى مراجعة والموافقة على العمل المنجز.</p>
          </div>
        `;
        break;

      case "supervisor_approved":
        subject = `تمت الموافقة من المشرف على الطلب ${workOrder.code}`;
        htmlContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif;">
            <h2>موافقة المشرف</h2>
            <p>تمت الموافقة من المشرف على طلب الصيانة رقم: <strong>${workOrder.code}</strong></p>
            <p>الجهاز: ${workOrder.assets?.name_ar || workOrder.assets?.name || "غير محدد"}</p>
          </div>
        `;
        break;

      case "engineer_approved":
        subject = `تمت الموافقة من المهندس على الطلب ${workOrder.code}`;
        htmlContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif;">
            <h2>موافقة المهندس</h2>
            <p>تمت الموافقة من المهندس على طلب الصيانة رقم: <strong>${workOrder.code}</strong></p>
            <p>الجهاز: ${workOrder.assets?.name_ar || workOrder.assets?.name || "غير محدد"}</p>
            <p>الطلب جاهز للإغلاق.</p>
          </div>
        `;
        break;

      case "rejected_by_technician":
        subject = `تم رفض الطلب ${workOrder.code} من قبل الفني`;
        htmlContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif;">
            <h2>رفض الطلب</h2>
            <p>تم رفض طلب الصيانة رقم: <strong>${workOrder.code}</strong> من قبل الفني</p>
            <p>الجهاز: ${workOrder.assets?.name_ar || workOrder.assets?.name || "غير محدد"}</p>
            ${workOrder.technician_notes ? `<p>ملاحظات الفني: ${workOrder.technician_notes}</p>` : ""}
          </div>
        `;
        break;

      case "customer_reviewed":
        subject = `تمت مراجعة الطلب ${workOrder.code}`;
        htmlContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif;">
            <h2>مراجعة العميل</h2>
            <p>تمت مراجعة طلب الصيانة رقم: <strong>${workOrder.code}</strong></p>
            <p>الجهاز: ${workOrder.assets?.name_ar || workOrder.assets?.name || "غير محدد"}</p>
            ${workOrder.customer_rating ? `<p>التقييم: ${workOrder.customer_rating}/5</p>` : ""}
            ${workOrder.customer_feedback ? `<p>الملاحظات: ${workOrder.customer_feedback}</p>` : ""}
          </div>
        `;
        break;

      case "final_approved":
        subject = `تم اعتماد الطلب ${workOrder.code} نهائياً`;
        htmlContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif;">
            <h2>اعتماد نهائي</h2>
            <p>تم اعتماد طلب الصيانة رقم: <strong>${workOrder.code}</strong> نهائياً</p>
            <p>الجهاز: ${workOrder.assets?.name_ar || workOrder.assets?.name || "غير محدد"}</p>
            <p>تم إغلاق الطلب بنجاح.</p>
          </div>
        `;
        break;

      default:
        subject = `تحديث على طلب الصيانة ${workOrder.code}`;
        htmlContent = `
          <div dir="rtl" style="font-family: Arial, sans-serif;">
            <h2>تحديث طلب الصيانة</h2>
            <p>هناك تحديث على طلب الصيانة رقم: <strong>${workOrder.code}</strong></p>
            <p>الجهاز: ${workOrder.assets?.name_ar || workOrder.assets?.name || "غير محدد"}</p>
          </div>
        `;
    }

    // Determine recipients
    const recipients = toEmails.length > 0 ? toEmails : (toEmail ? [toEmail] : []);
    
    console.log("Final recipients list:", recipients);
    console.log("toEmails:", toEmails, "toEmail:", toEmail);

    if (recipients.length === 0) {
      console.warn("No recipient email found, skipping email send");
      return new Response(
        JSON.stringify({ message: "No recipient email found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "نظام الصيانة <noreply@facility-management.space>",
      to: recipients,
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-work-order-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
