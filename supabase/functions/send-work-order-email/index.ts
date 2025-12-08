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
  rejectionStage?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workOrderId, eventType, recipientEmail, rejectionStage }: EmailRequest = await req.json();
    
    console.log("Processing email notification:", { workOrderId, eventType, recipientEmail, rejectionStage });

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch work order details with all related data
    const { data: workOrder, error: woError } = await supabase
      .from("work_orders")
      .select(`
        *,
        assets (name, name_ar),
        teams (name, name_ar)
      `)
      .eq("id", workOrderId)
      .maybeSingle();

    if (woError) {
      console.error("Database error fetching work order:", woError);
      throw new Error(`Database error: ${woError.message}`);
    }

    if (!workOrder) {
      console.error("Work order not found with ID:", workOrderId);
      throw new Error(`Work order not found with ID: ${workOrderId}`);
    }

    // Fetch reporter profile
    let reporterProfile = null;
    if (workOrder.reported_by) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", workOrder.reported_by)
        .maybeSingle();
      reporterProfile = profile;
    }

    // Helper function to get team members' emails
    const getTeamMemberEmails = async (teamId: string): Promise<string[]> => {
      const { data: teamMembers } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (!teamMembers || teamMembers.length === 0) return [];

      const userIds = teamMembers.map(tm => tm.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("email")
        .in("id", userIds);

      return profiles?.map(p => p.email).filter(email => email) || [];
    };

    // Helper function to get users with specific permission in hospital
    const getUsersWithPermission = async (permission: string, hospitalId: string): Promise<string[]> => {
      // Get all users with the permission through their roles
      const { data: rolePermissions } = await supabase
        .from("role_permissions")
        .select("role_code")
        .eq("permission_key", permission)
        .eq("allowed", true);

      if (!rolePermissions || rolePermissions.length === 0) return [];

      const roleCodes = rolePermissions.map(rp => rp.role_code).filter(Boolean);

      const { data: userRoles } = await supabase
        .from("user_custom_roles")
        .select("user_id")
        .in("role_code", roleCodes)
        .eq("hospital_id", hospitalId);

      if (!userRoles || userRoles.length === 0) return [];

      const userIds = [...new Set(userRoles.map(ur => ur.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("email")
        .in("id", userIds);

      return profiles?.map(p => p.email).filter(email => email) || [];
    };

    // Determine recipients based on event type
    let recipients: string[] = [];
    let subject = "";
    let htmlContent = "";

    switch (eventType) {
      case "new_work_order": {
        // Send to assigned team members
        if (workOrder.assigned_team) {
          recipients = await getTeamMemberEmails(workOrder.assigned_team);
        }
        subject = `New Maintenance Report | بلاغ صيانة جديد - ${workOrder.code}`;
        htmlContent = buildNewWorkOrderEmail(workOrder, reporterProfile);
        break;
      }

      case "work_started": {
        // Send to reporter and supervisors
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        const supervisors = await getUsersWithPermission("work_orders.approve", workOrder.hospital_id);
        recipients = [...new Set([...recipients, ...supervisors])];
        subject = `Work Started | بدء العمل - ${workOrder.code}`;
        htmlContent = buildWorkStartedEmail(workOrder);
        break;
      }

      case "work_completed": {
        // Send to supervisors who can approve
        recipients = await getUsersWithPermission("work_orders.approve", workOrder.hospital_id);
        subject = `Pending Approval | بانتظار الموافقة - ${workOrder.code}`;
        htmlContent = buildWorkCompletedEmail(workOrder);
        break;
      }

      case "supervisor_approved": {
        // Send to engineers who can review
        recipients = await getUsersWithPermission("work_orders.review_as_engineer", workOrder.hospital_id);
        subject = `Pending Engineer Review | بانتظار مراجعة المهندس - ${workOrder.code}`;
        htmlContent = buildSupervisorApprovedEmail(workOrder);
        break;
      }

      case "engineer_approved": {
        // Send to reporter for closure
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        subject = `Pending Closure | بانتظار الإغلاق - ${workOrder.code}`;
        htmlContent = buildEngineerApprovedEmail(workOrder);
        break;
      }

      case "customer_reviewed": {
        // Send to team and managers
        if (workOrder.assigned_team) {
          const teamEmails = await getTeamMemberEmails(workOrder.assigned_team);
          recipients = [...teamEmails];
        }
        const managers = await getUsersWithPermission("work_orders.final_approve", workOrder.hospital_id);
        recipients = [...new Set([...recipients, ...managers])];
        subject = `Work Order Closed | تم إغلاق أمر العمل - ${workOrder.code}`;
        htmlContent = buildCustomerReviewedEmail(workOrder);
        break;
      }

      case "final_approved": {
        // Send to reporter and team
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        if (workOrder.assigned_team) {
          const teamEmails = await getTeamMemberEmails(workOrder.assigned_team);
          recipients = [...new Set([...recipients, ...teamEmails])];
        }
        subject = `Final Approval | اعتماد نهائي - ${workOrder.code}`;
        htmlContent = buildFinalApprovedEmail(workOrder);
        break;
      }

      case "rejected": {
        // Determine recipient based on rejection stage
        const stage = rejectionStage || workOrder.rejection_stage;
        
        if (stage === "technician") {
          // Technician rejected -> notify supervisors
          recipients = await getUsersWithPermission("work_orders.approve", workOrder.hospital_id);
          subject = `Technician Rejected | رفض الفني - ${workOrder.code}`;
          htmlContent = buildRejectionEmail(workOrder, "technician", "Technician", "الفني");
        } else if (stage === "supervisor") {
          // Supervisor rejected -> notify team (technicians)
          if (workOrder.assigned_team) {
            recipients = await getTeamMemberEmails(workOrder.assigned_team);
          }
          subject = `Supervisor Rejected | رفض المشرف - ${workOrder.code}`;
          htmlContent = buildRejectionEmail(workOrder, "supervisor", "Supervisor", "المشرف");
        } else if (stage === "engineer") {
          // Engineer rejected -> notify supervisors
          recipients = await getUsersWithPermission("work_orders.approve", workOrder.hospital_id);
          subject = `Engineer Rejected | رفض المهندس - ${workOrder.code}`;
          htmlContent = buildRejectionEmail(workOrder, "engineer", "Engineer", "المهندس");
        } else if (stage === "reporter") {
          // Reporter rejected -> notify engineers
          recipients = await getUsersWithPermission("work_orders.review_as_engineer", workOrder.hospital_id);
          subject = `Reporter Rejected | رفض المُبلِّغ - ${workOrder.code}`;
          htmlContent = buildRejectionEmail(workOrder, "reporter", "Reporter", "المُبلِّغ");
        }
        break;
      }

      default: {
        // Generic update
        if (reporterProfile?.email) recipients.push(reporterProfile.email);
        subject = `Update | تحديث - ${workOrder.code}`;
        htmlContent = buildGenericUpdateEmail(workOrder);
      }
    }

    // Remove duplicates and filter empty
    recipients = [...new Set(recipients)].filter(email => email);

    console.log("Final recipients:", recipients);

    // Create in-app notifications for recipient users
    const notificationData = getNotificationData(eventType, workOrder, rejectionStage);
    if (notificationData && recipients.length > 0) {
      // Get user IDs from emails
      const { data: recipientProfiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("email", recipients);

      if (recipientProfiles && recipientProfiles.length > 0) {
        const inAppNotifications = recipientProfiles.map(profile => ({
          user_id: profile.id,
          title: notificationData.title,
          title_ar: notificationData.titleAr,
          message: notificationData.message,
          message_ar: notificationData.messageAr,
          type: notificationData.type,
          related_task_id: null, // work orders don't link to maintenance_tasks
        }));

        const { error: notifError } = await supabase
          .from("notifications")
          .insert(inAppNotifications);

        if (notifError) {
          console.error("Error creating in-app notifications:", notifError);
        } else {
          console.log(`Created ${inAppNotifications.length} in-app notifications`);
        }
      }
    }

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
      JSON.stringify({ success: true, emailId: emailResponse.data?.id, recipients }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-work-order-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

// Email template builders
function buildNewWorkOrderEmail(workOrder: any, reporterProfile: any): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">🆕 New Maintenance Report</h1>
        <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px; font-weight: 400;">بلاغ صيانة جديد</h2>
      </div>
      <div style="padding: 30px 20px;">
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="display: inline-block; background: #f7f9fc; border: 2px solid #667eea; border-radius: 8px; padding: 12px 24px;">
            <span style="color: #666; font-size: 13px;">Report #</span>
            <div style="color: #667eea; font-size: 24px; font-weight: 700;">${workOrder.code}</div>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 12px; background: #f7f9fc; border-bottom: 1px solid #e0e0e0; width: 40%; font-weight: 600;">Issue Type | نوع المشكلة</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${workOrder.issue_type || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; background: #f7f9fc; border-bottom: 1px solid #e0e0e0; font-weight: 600;">Priority | الأولوية</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
              <span style="padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; ${getPriorityStyle(workOrder.priority)}">
                ${workOrder.priority?.toUpperCase() || 'NORMAL'}
              </span>
            </td>
          </tr>
          ${workOrder.assets ? `
          <tr>
            <td style="padding: 12px; background: #f7f9fc; border-bottom: 1px solid #e0e0e0; font-weight: 600;">Asset | الأصل</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${workOrder.assets?.name_ar || workOrder.assets?.name || '-'}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 12px; background: #f7f9fc; border-bottom: 1px solid #e0e0e0; font-weight: 600;">Reporter | المبلغ</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${reporterProfile?.full_name || 'غير محدد'}</td>
          </tr>
        </table>
        <div style="margin: 25px 0; padding: 20px; background: #f7f9fc; border-left: 4px solid #667eea; border-radius: 4px;">
          <div style="font-weight: 600; color: #444; margin-bottom: 8px;">Description | الوصف</div>
          <div style="color: #666; line-height: 1.6;">${workOrder.description || '-'}</div>
        </div>
        <div style="text-align: center; padding: 20px; background: #fff3cd; border-radius: 8px;">
          <p style="color: #856404; margin: 0; font-weight: 600;">⚡ Action Required | مطلوب إجراء</p>
          <p style="color: #856404; margin: 10px 0 0 0;">Please start work on this report as soon as possible</p>
          <p dir="rtl" style="color: #856404; margin: 5px 0 0 0;">يرجى بدء العمل على هذا البلاغ في أقرب وقت</p>
        </div>
      </div>
      ${buildFooter()}
    </div>
  `;
}

function buildWorkStartedEmail(workOrder: any): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">▶️ Work Started | بدء العمل</h1>
      </div>
      <div style="padding: 30px 20px;">
        <p style="color: #666; line-height: 1.6;">Work has been started on maintenance report <strong style="color: #4facfe;">${workOrder.code}</strong></p>
        <p dir="rtl" style="color: #666; line-height: 1.6;">تم بدء العمل على طلب الصيانة رقم <strong style="color: #4facfe;">${workOrder.code}</strong></p>
        ${workOrder.teams ? `<p style="color: #666;"><strong>Team | الفريق:</strong> ${workOrder.teams?.name_ar || workOrder.teams?.name}</p>` : ''}
      </div>
      ${buildFooter()}
    </div>
  `;
}

function buildWorkCompletedEmail(workOrder: any): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⏳ Pending Supervisor Approval</h1>
        <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px;">بانتظار موافقة المشرف</h2>
      </div>
      <div style="padding: 30px 20px;">
        <p style="color: #666; line-height: 1.6;">Work has been completed on maintenance report <strong>${workOrder.code}</strong>. Please review and approve.</p>
        <p dir="rtl" style="color: #666; line-height: 1.6;">تم إكمال العمل على طلب الصيانة رقم <strong>${workOrder.code}</strong>. يرجى المراجعة والموافقة.</p>
        ${workOrder.technician_notes ? `
        <div style="margin: 20px 0; padding: 15px; background: #f7f9fc; border-left: 4px solid #f5576c; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px;">Technician Notes | ملاحظات الفني</div>
          <div style="color: #666;">${workOrder.technician_notes}</div>
        </div>
        ` : ''}
        <div style="text-align: center; padding: 20px; background: #fff3cd; border-radius: 8px; margin-top: 20px;">
          <p style="color: #856404; margin: 0; font-weight: 600;">⚡ Your Approval Required | مطلوب موافقتك</p>
        </div>
      </div>
      ${buildFooter()}
    </div>
  `;
}

function buildSupervisorApprovedEmail(workOrder: any): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⏳ Pending Engineer Review</h1>
        <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px;">بانتظار مراجعة المهندس</h2>
      </div>
      <div style="padding: 30px 20px;">
        <p style="color: #666; line-height: 1.6;">Supervisor has approved maintenance report <strong>${workOrder.code}</strong>. Please review as engineer.</p>
        <p dir="rtl" style="color: #666; line-height: 1.6;">وافق المشرف على طلب الصيانة رقم <strong>${workOrder.code}</strong>. يرجى المراجعة كمهندس.</p>
        ${workOrder.supervisor_notes ? `
        <div style="margin: 20px 0; padding: 15px; background: #f7f9fc; border-left: 4px solid #fa709a; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px;">Supervisor Notes | ملاحظات المشرف</div>
          <div style="color: #666;">${workOrder.supervisor_notes}</div>
        </div>
        ` : ''}
        <div style="text-align: center; padding: 20px; background: #fff3cd; border-radius: 8px; margin-top: 20px;">
          <p style="color: #856404; margin: 0; font-weight: 600;">⚡ Your Review Required | مطلوب مراجعتك</p>
        </div>
      </div>
      ${buildFooter()}
    </div>
  `;
}

function buildEngineerApprovedEmail(workOrder: any): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ Ready for Closure</h1>
        <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px;">جاهز للإغلاق</h2>
      </div>
      <div style="padding: 30px 20px;">
        <p style="color: #666; line-height: 1.6;">Maintenance report <strong>${workOrder.code}</strong> has been reviewed and approved. Please close the report.</p>
        <p dir="rtl" style="color: #666; line-height: 1.6;">تمت مراجعة طلب الصيانة رقم <strong>${workOrder.code}</strong> والموافقة عليه. يرجى إغلاق البلاغ.</p>
        ${workOrder.engineer_notes ? `
        <div style="margin: 20px 0; padding: 15px; background: #f7f9fc; border-left: 4px solid #43e97b; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px;">Engineer Notes | ملاحظات المهندس</div>
          <div style="color: #666;">${workOrder.engineer_notes}</div>
        </div>
        ` : ''}
        <div style="text-align: center; padding: 20px; background: #d4edda; border-radius: 8px; margin-top: 20px;">
          <p style="color: #155724; margin: 0; font-weight: 600;">⚡ Please Close the Report | يرجى إغلاق البلاغ</p>
          <p style="color: #155724; margin: 10px 0 0 0; font-size: 14px;">سيتم إغلاق البلاغ تلقائياً خلال 24 ساعة إذا لم يتم الإغلاق يدوياً</p>
        </div>
      </div>
      ${buildFooter()}
    </div>
  `;
}

function buildCustomerReviewedEmail(workOrder: any): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📋 Report Closed | تم إغلاق البلاغ</h1>
      </div>
      <div style="padding: 30px 20px;">
        <p style="color: #666; line-height: 1.6;">Maintenance report <strong>${workOrder.code}</strong> has been closed by the reporter.</p>
        <p dir="rtl" style="color: #666; line-height: 1.6;">تم إغلاق طلب الصيانة رقم <strong>${workOrder.code}</strong> من قبل المُبلِّغ.</p>
        ${workOrder.customer_rating ? `
        <div style="text-align: center; margin: 20px 0; padding: 15px; background: #fff8e1; border-radius: 8px;">
          <div style="font-size: 14px; color: #666; margin-bottom: 8px;">Rating | التقييم</div>
          <div style="font-size: 32px; color: #ffa000; font-weight: bold;">${workOrder.customer_rating}/5 ⭐</div>
        </div>
        ` : ''}
        ${workOrder.reporter_notes ? `
        <div style="margin: 20px 0; padding: 15px; background: #f7f9fc; border-left: 4px solid #19547b; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px;">Reporter Notes | ملاحظات المُبلِّغ</div>
          <div style="color: #666;">${workOrder.reporter_notes}</div>
        </div>
        ` : ''}
      </div>
      ${buildFooter()}
    </div>
  `;
}

function buildFinalApprovedEmail(workOrder: any): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✓ Final Approval Complete</h1>
        <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px;">تم الاعتماد النهائي</h2>
      </div>
      <div style="padding: 30px 20px;">
        <p style="color: #666; line-height: 1.6;">Maintenance report <strong style="color: #11998e;">${workOrder.code}</strong> has been finally approved and archived.</p>
        <p dir="rtl" style="color: #666; line-height: 1.6;">تم اعتماد طلب الصيانة رقم <strong style="color: #11998e;">${workOrder.code}</strong> نهائياً وأرشفته.</p>
      </div>
      ${buildFooter()}
    </div>
  `;
}

function buildRejectionEmail(workOrder: any, stage: string, stageNameEn: string, stageNameAr: string): string {
  const notesField = `${stage}_notes`;
  const notes = workOrder[notesField] || workOrder.rejection_reason || '';
  
  // Determine what needs to happen next based on stage
  let actionEn = "";
  let actionAr = "";
  
  switch (stage) {
    case "technician":
      actionEn = "Please reassign the work order to another technician or team.";
      actionAr = "يرجى إعادة تعيين أمر العمل لفني أو فريق آخر.";
      break;
    case "supervisor":
      actionEn = "Please redo the work according to the supervisor's feedback.";
      actionAr = "يرجى إعادة العمل وفقاً لملاحظات المشرف.";
      break;
    case "engineer":
      actionEn = "Please review the work again with the technician.";
      actionAr = "يرجى مراجعة العمل مرة أخرى مع الفني.";
      break;
    case "reporter":
      actionEn = "The reporter is not satisfied. Please review and address the concerns.";
      actionAr = "المُبلِّغ غير راضٍ. يرجى المراجعة ومعالجة الملاحظات.";
      break;
  }

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">❌ Work Order Rejected</h1>
        <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px;">تم رفض أمر العمل</h2>
      </div>
      <div style="padding: 30px 20px;">
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="display: inline-block; background: #fee; border: 2px solid #ff6b6b; border-radius: 8px; padding: 12px 24px;">
            <span style="color: #666; font-size: 13px;">Report #</span>
            <div style="color: #ff6b6b; font-size: 24px; font-weight: 700;">${workOrder.code}</div>
          </div>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
          <strong>English:</strong> This work order has been rejected by the <strong style="color: #ff6b6b;">${stageNameEn}</strong>.
        </p>
        <p dir="rtl" style="color: #666; line-height: 1.6;">
          <strong>عربي:</strong> تم رفض أمر العمل هذا من قبل <strong style="color: #ff6b6b;">${stageNameAr}</strong>.
        </p>
        
        ${notes ? `
        <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-left: 4px solid #ff6b6b; border-radius: 4px;">
          <div style="font-weight: 600; color: #856404; margin-bottom: 8px;">Rejection Reason | سبب الرفض</div>
          <div style="color: #856404; line-height: 1.6;">${notes.replace('رفض: ', '')}</div>
        </div>
        ` : ''}
        
        <div style="text-align: center; padding: 20px; background: #fff3cd; border-radius: 8px; margin-top: 20px;">
          <p style="color: #856404; margin: 0; font-weight: 600;">⚡ Action Required | مطلوب إجراء</p>
          <p style="color: #856404; margin: 10px 0 0 0;">${actionEn}</p>
          <p dir="rtl" style="color: #856404; margin: 5px 0 0 0;">${actionAr}</p>
        </div>
      </div>
      ${buildFooter()}
    </div>
  `;
}

function buildGenericUpdateEmail(workOrder: any): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📢 Work Order Update</h1>
        <h2 style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 18px;">تحديث أمر العمل</h2>
      </div>
      <div style="padding: 30px 20px;">
        <p style="color: #666; line-height: 1.6;">There is an update on maintenance report <strong>${workOrder.code}</strong></p>
        <p dir="rtl" style="color: #666; line-height: 1.6;">هناك تحديث على طلب الصيانة رقم <strong>${workOrder.code}</strong></p>
      </div>
      ${buildFooter()}
    </div>
  `;
}

function buildFooter(): string {
  return `
    <div style="background: #f7f9fc; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #999; font-size: 12px; margin: 0;">
        This is an automated notification from Mutqan CMMS<br>
        هذا إشعار تلقائي من نظام متقن لإدارة الصيانة
      </p>
    </div>
  `;
}

function getPriorityStyle(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'urgent':
    case 'high':
      return 'background: #fee; color: #c33;';
    case 'medium':
      return 'background: #ffeaa7; color: #d63031;';
    default:
      return 'background: #dfe6e9; color: #2d3436;';
  }
}

interface NotificationContent {
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  type: string;
}

function getNotificationData(eventType: string, workOrder: any, rejectionStage?: string): NotificationContent | null {
  const code = workOrder.code;
  
  switch (eventType) {
    case "new_work_order":
      return {
        title: `New Work Order: ${code}`,
        titleAr: `بلاغ صيانة جديد: ${code}`,
        message: `A new maintenance report has been assigned to your team`,
        messageAr: `تم تعيين بلاغ صيانة جديد لفريقك`,
        type: "task_assigned"
      };
    case "work_started":
      return {
        title: `Work Started: ${code}`,
        titleAr: `بدء العمل: ${code}`,
        message: `Work has been started on your maintenance report`,
        messageAr: `تم بدء العمل على بلاغ الصيانة الخاص بك`,
        type: "upcoming_task"
      };
    case "work_completed":
      return {
        title: `Pending Approval: ${code}`,
        titleAr: `بانتظار الموافقة: ${code}`,
        message: `A work order is awaiting your approval`,
        messageAr: `أمر عمل ينتظر موافقتك`,
        type: "task_assigned"
      };
    case "supervisor_approved":
      return {
        title: `Pending Review: ${code}`,
        titleAr: `بانتظار المراجعة: ${code}`,
        message: `A work order is awaiting your engineering review`,
        messageAr: `أمر عمل ينتظر مراجعتك الهندسية`,
        type: "task_assigned"
      };
    case "engineer_approved":
      return {
        title: `Ready for Closure: ${code}`,
        titleAr: `جاهز للإغلاق: ${code}`,
        message: `Your maintenance report is ready to be closed`,
        messageAr: `بلاغ الصيانة الخاص بك جاهز للإغلاق`,
        type: "upcoming_task"
      };
    case "customer_reviewed":
      return {
        title: `Report Closed: ${code}`,
        titleAr: `تم إغلاق البلاغ: ${code}`,
        message: `The maintenance report has been closed`,
        messageAr: `تم إغلاق بلاغ الصيانة`,
        type: "task_completed"
      };
    case "final_approved":
      return {
        title: `Final Approval: ${code}`,
        titleAr: `الاعتماد النهائي: ${code}`,
        message: `The work order has received final approval`,
        messageAr: `حصل أمر العمل على الاعتماد النهائي`,
        type: "task_completed"
      };
    case "rejected": {
      const stage = rejectionStage || workOrder.rejection_stage;
      const stageNames: Record<string, { en: string; ar: string }> = {
        technician: { en: "Technician", ar: "الفني" },
        supervisor: { en: "Supervisor", ar: "المشرف" },
        engineer: { en: "Engineer", ar: "المهندس" },
        reporter: { en: "Reporter", ar: "المُبلِّغ" }
      };
      const stageName = stageNames[stage] || { en: stage, ar: stage };
      
      return {
        title: `Rejected by ${stageName.en}: ${code}`,
        titleAr: `مرفوض من ${stageName.ar}: ${code}`,
        message: `Work order has been rejected and requires action`,
        messageAr: `تم رفض أمر العمل ويتطلب إجراء`,
        type: "overdue_task"
      };
    }
    default:
      return null;
  }
}

serve(handler);
