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
        subject = `New Maintenance Report | بلاغ صيانة جديد - ${workOrder.code}`;
        htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">New Maintenance Report</h1>
              <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px; font-weight: 400;">بلاغ صيانة جديد</h2>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
              <!-- Report Number -->
              <div style="text-align: center; margin-bottom: 25px;">
                <div style="display: inline-block; background: #f7f9fc; border: 2px solid #667eea; border-radius: 8px; padding: 12px 24px;">
                  <span style="color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Report #</span>
                  <div style="color: #667eea; font-size: 24px; font-weight: 700; margin-top: 4px;">${workOrder.code}</div>
                </div>
              </div>

              <!-- Details Table -->
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 12px; background: #f7f9fc; border-bottom: 1px solid #e0e0e0; width: 40%; font-weight: 600; color: #444;">Issue Type | نوع المشكلة</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; color: #666;">${workOrder.issue_type}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; background: #f7f9fc; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #444;">Priority | الأولوية</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; 
                      ${workOrder.priority === 'high' || workOrder.priority === 'urgent' 
                        ? 'background: #fee; color: #c33;' 
                        : workOrder.priority === 'medium' 
                        ? 'background: #ffeaa7; color: #d63031;' 
                        : 'background: #dfe6e9; color: #2d3436;'}">
                      ${workOrder.priority.toUpperCase()}
                    </span>
                  </td>
                </tr>
                ${workOrder.assets ? `
                <tr>
                  <td style="padding: 12px; background: #f7f9fc; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #444;">Asset | الأصل</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; color: #666;">${workOrder.assets?.name_ar || workOrder.assets?.name || "-"}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px; background: #f7f9fc; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #444;">Reporter | المبلغ</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; color: #666;">${reporterProfile?.full_name || "Not specified"}</td>
                </tr>
              </table>

              <!-- Description -->
              <div style="margin: 25px 0; padding: 20px; background: #f7f9fc; border-left: 4px solid #667eea; border-radius: 4px;">
                <div style="font-weight: 600; color: #444; margin-bottom: 8px; font-size: 14px;">Description | الوصف</div>
                <div style="color: #666; line-height: 1.6; white-space: pre-wrap;">${workOrder.description}</div>
              </div>

              <!-- Call to Action -->
              <div style="text-align: center; margin-top: 30px; padding-top: 25px; border-top: 2px solid #e0e0e0;">
                <p style="color: #666; margin: 0 0 15px 0; font-size: 15px;">
                  <strong>English:</strong> Please review and take action on this maintenance report as soon as possible.
                </p>
                <p dir="rtl" style="color: #666; margin: 0; font-size: 15px;">
                  <strong>عربي:</strong> يرجى المراجعة والعمل على هذا البلاغ في أقرب وقت ممكن.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f7f9fc; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This is an automated notification from the Maintenance Management System<br>
                هذا إشعار تلقائي من نظام إدارة الصيانة
              </p>
            </div>
          </div>
        `;
        break;

      case "work_started":
        subject = `Work Started | بدء العمل - ${workOrder.code}`;
        htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Work Started</h1>
              <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px; font-weight: 400;">تم بدء العمل</h2>
            </div>
            <div style="padding: 30px 20px;">
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                <strong>English:</strong> Work has been started on maintenance report <strong style="color: #4facfe;">${workOrder.code}</strong>
              </p>
              <p dir="rtl" style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                <strong>عربي:</strong> تم بدء العمل على طلب الصيانة رقم <strong style="color: #4facfe;">${workOrder.code}</strong>
              </p>
              ${workOrder.assets ? `<p style="color: #666;"><strong>Asset | الأصل:</strong> ${workOrder.assets?.name_ar || workOrder.assets?.name}</p>` : ''}
              ${workOrder.teams ? `<p style="color: #666;"><strong>Team | الفريق:</strong> ${workOrder.teams?.name_ar || workOrder.teams?.name}</p>` : ''}
            </div>
          </div>
        `;
        break;

      case "work_completed":
        subject = `Work Completed | اكتمال العمل - ${workOrder.code}`;
        htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Work Completed</h1>
              <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px; font-weight: 400;">تم إكمال العمل</h2>
            </div>
            <div style="padding: 30px 20px;">
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                <strong>English:</strong> Work has been completed on maintenance report <strong style="color: #43e97b;">${workOrder.code}</strong>. Please review and approve the completed work.
              </p>
              <p dir="rtl" style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                <strong>عربي:</strong> تم إكمال العمل على طلب الصيانة رقم <strong style="color: #43e97b;">${workOrder.code}</strong>. يرجى مراجعة والموافقة على العمل المنجز.
              </p>
              ${workOrder.assets ? `<p style="color: #666;"><strong>Asset | الأصل:</strong> ${workOrder.assets?.name_ar || workOrder.assets?.name}</p>` : ''}
            </div>
          </div>
        `;
        break;

      case "supervisor_approved":
        subject = `Supervisor Approved | موافقة المشرف - ${workOrder.code}`;
        htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Supervisor Approved</h1>
              <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px; font-weight: 400;">موافقة المشرف</h2>
            </div>
            <div style="padding: 30px 20px;">
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                <strong>English:</strong> The supervisor has approved maintenance report <strong style="color: #f5576c;">${workOrder.code}</strong>
              </p>
              <p dir="rtl" style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                <strong>عربي:</strong> تمت الموافقة من المشرف على طلب الصيانة رقم <strong style="color: #f5576c;">${workOrder.code}</strong>
              </p>
              ${workOrder.assets ? `<p style="color: #666;"><strong>Asset | الأصل:</strong> ${workOrder.assets?.name_ar || workOrder.assets?.name}</p>` : ''}
            </div>
          </div>
        `;
        break;

      case "engineer_approved":
        subject = `Engineer Approved | موافقة المهندس - ${workOrder.code}`;
        htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Engineer Approved</h1>
              <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px; font-weight: 400;">موافقة المهندس</h2>
            </div>
            <div style="padding: 30px 20px;">
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                <strong>English:</strong> The engineer has approved maintenance report <strong style="color: #fa709a;">${workOrder.code}</strong>. The report is ready for closure.
              </p>
              <p dir="rtl" style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                <strong>عربي:</strong> تمت الموافقة من المهندس على طلب الصيانة رقم <strong style="color: #fa709a;">${workOrder.code}</strong>. الطلب جاهز للإغلاق.
              </p>
              ${workOrder.assets ? `<p style="color: #666;"><strong>Asset | الأصل:</strong> ${workOrder.assets?.name_ar || workOrder.assets?.name}</p>` : ''}
            </div>
          </div>
        `;
        break;

      case "rejected_by_technician":
        subject = `Rejected | رفض - ${workOrder.code}`;
        htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Report Rejected</h1>
              <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px; font-weight: 400;">تم رفض البلاغ</h2>
            </div>
            <div style="padding: 30px 20px;">
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                <strong>English:</strong> Maintenance report <strong style="color: #ff6b6b;">${workOrder.code}</strong> has been rejected by the technician.
              </p>
              <p dir="rtl" style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                <strong>عربي:</strong> تم رفض طلب الصيانة رقم <strong style="color: #ff6b6b;">${workOrder.code}</strong> من قبل الفني.
              </p>
              ${workOrder.technician_notes ? `
              <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-left: 4px solid #ff6b6b; border-radius: 4px;">
                <div style="font-weight: 600; color: #856404; margin-bottom: 8px;">Technician Notes | ملاحظات الفني</div>
                <div style="color: #856404; line-height: 1.6;">${workOrder.technician_notes}</div>
              </div>
              ` : ''}
            </div>
          </div>
        `;
        break;

      case "customer_reviewed":
        subject = `Customer Review | مراجعة العميل - ${workOrder.code}`;
        htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Customer Review</h1>
              <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px; font-weight: 400;">مراجعة العميل</h2>
            </div>
            <div style="padding: 30px 20px;">
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                <strong>English:</strong> Customer has reviewed maintenance report <strong>${workOrder.code}</strong>
              </p>
              <p dir="rtl" style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                <strong>عربي:</strong> تمت مراجعة طلب الصيانة رقم <strong>${workOrder.code}</strong>
              </p>
              ${workOrder.customer_rating ? `
              <div style="text-align: center; margin: 20px 0; padding: 15px; background: #fff8e1; border-radius: 8px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 8px;">Rating | التقييم</div>
                <div style="font-size: 32px; color: #ffa000; font-weight: bold;">${workOrder.customer_rating}/5 ⭐</div>
              </div>
              ` : ''}
              ${workOrder.customer_feedback ? `
              <div style="margin: 20px 0; padding: 15px; background: #f7f9fc; border-left: 4px solid #19547b; border-radius: 4px;">
                <div style="font-weight: 600; color: #444; margin-bottom: 8px;">Feedback | الملاحظات</div>
                <div style="color: #666; line-height: 1.6;">${workOrder.customer_feedback}</div>
              </div>
              ` : ''}
            </div>
          </div>
        `;
        break;

      case "final_approved":
        subject = `Final Approval | اعتماد نهائي - ${workOrder.code}`;
        htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">✓ Final Approval</h1>
              <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px; font-weight: 400;">اعتماد نهائي</h2>
            </div>
            <div style="padding: 30px 20px;">
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                <strong>English:</strong> Maintenance report <strong style="color: #11998e;">${workOrder.code}</strong> has been finally approved. The report has been successfully closed.
              </p>
              <p dir="rtl" style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                <strong>عربي:</strong> تم اعتماد طلب الصيانة رقم <strong style="color: #11998e;">${workOrder.code}</strong> نهائياً. تم إغلاق الطلب بنجاح.
              </p>
              ${workOrder.assets ? `<p style="color: #666;"><strong>Asset | الأصل:</strong> ${workOrder.assets?.name_ar || workOrder.assets?.name}</p>` : ''}
            </div>
          </div>
        `;
        break;

      default:
        subject = `Update | تحديث - ${workOrder.code}`;
        htmlContent = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Maintenance Report Update</h1>
              <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px; font-weight: 400;">تحديث طلب صيانة</h2>
            </div>
            <div style="padding: 30px 20px;">
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                <strong>English:</strong> There is an update on maintenance report <strong>${workOrder.code}</strong>
              </p>
              <p dir="rtl" style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                <strong>عربي:</strong> هناك تحديث على طلب الصيانة رقم <strong>${workOrder.code}</strong>
              </p>
              ${workOrder.assets ? `<p style="color: #666;"><strong>Asset | الأصل:</strong> ${workOrder.assets?.name_ar || workOrder.assets?.name}</p>` : ''}
            </div>
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
