import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkOrderNotificationRequest {
  workOrderId: string;
  action: 'assigned' | 'completed' | 'supervisor_approved' | 'engineer_approved' | 'customer_reviewed' | 'final_approved' | 'status_changed' | 'rejected_by_technician';
  performedBy: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { workOrderId, action, performedBy }: WorkOrderNotificationRequest = await req.json();

    // Get work order details
    const { data: workOrder, error: woError } = await supabase
      .from("work_orders")
      .select(`
        *,
        reporter:reported_by(full_name, full_name_ar),
        technician:assigned_to(full_name, full_name_ar),
        supervisor:supervisor_approved_by(full_name, full_name_ar),
        engineer:engineer_approved_by(full_name, full_name_ar)
      `)
      .eq("id", workOrderId)
      .single();

    if (woError) throw woError;

    // Get performer details
    const { data: performer } = await supabase
      .from("profiles")
      .select("full_name, full_name_ar")
      .eq("id", performedBy)
      .single();

    const performerName = performer?.full_name || "User";
    const performerNameAr = performer?.full_name_ar || "مستخدم";

    let notificationConfig: { userIds: string[], title: string, titleAr: string, body: string, bodyAr: string } = {
      userIds: [],
      title: "",
      titleAr: "",
      body: "",
      bodyAr: ""
    };

    // Determine notification recipients and message based on action
    switch (action) {
      case 'assigned':
        // Notify assigned team members
        if (workOrder.assigned_team) {
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', workOrder.assigned_team);
          
          notificationConfig.userIds = teamMembers?.map(m => m.user_id) || [];
          notificationConfig.title = 'New Work Order Assigned to Your Team';
          notificationConfig.titleAr = 'تم تعيين بلاغ جديد لفريقك';
          notificationConfig.body = `Work order ${workOrder.code} has been assigned to your team`;
          notificationConfig.bodyAr = `تم تعيين البلاغ ${workOrder.code} لفريقك`;
        }
        break;

      case 'completed':
        // Notify supervisor for approval
        const { data: supervisors } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "supervisor")
          .eq("hospital_id", workOrder.hospital_id);
        
        notificationConfig.userIds = supervisors?.map(s => s.user_id) || [];
        notificationConfig.title = 'Work Order Completed - Pending Approval';
        notificationConfig.titleAr = 'تم إكمال البلاغ - بانتظار الاعتماد';
        notificationConfig.body = `Work order ${workOrder.code} has been completed and needs your approval`;
        notificationConfig.bodyAr = `تم إكمال البلاغ ${workOrder.code} ويحتاج لاعتمادك`;
        break;

      case 'supervisor_approved':
        // Notify engineers and reporter
        const { data: engineers } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "maintenance_engineer")
          .eq("hospital_id", workOrder.hospital_id);
        
        notificationConfig.userIds = [
          workOrder.reported_by,
          workOrder.assigned_to,
          ...(engineers?.map(e => e.user_id) || [])
        ].filter(Boolean);
        notificationConfig.title = `Supervisor Approved`;
        notificationConfig.titleAr = `موافقة المشرف`;
        notificationConfig.body = `Work order ${workOrder.code} approved by supervisor`;
        notificationConfig.bodyAr = `تمت الموافقة على أمر العمل ${workOrder.code} من المشرف`;
        break;

      case 'engineer_approved':
        // Notify reporter for review
        notificationConfig.userIds = [workOrder.reported_by];
        notificationConfig.title = `Ready for Your Review`;
        notificationConfig.titleAr = `جاهز للمراجعة`;
        notificationConfig.body = `Work order ${workOrder.code} is ready for your review`;
        notificationConfig.bodyAr = `أمر العمل ${workOrder.code} جاهز لمراجعتك`;
        break;

      case 'customer_reviewed':
        // Notify maintenance managers for final approval
        const { data: managers } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "maintenance_manager")
          .eq("hospital_id", workOrder.hospital_id);
        
        notificationConfig.userIds = managers?.map(m => m.user_id) || [];
        notificationConfig.title = `Final Approval Needed`;
        notificationConfig.titleAr = `مطلوب الاعتماد النهائي`;
        notificationConfig.body = `Work order ${workOrder.code} needs final approval`;
        notificationConfig.bodyAr = `أمر العمل ${workOrder.code} يحتاج للاعتماد النهائي`;
        break;

      case 'final_approved':
        // Notify everyone involved
        notificationConfig.userIds = [
          workOrder.reported_by,
          workOrder.assigned_to,
          workOrder.supervisor_approved_by,
          workOrder.engineer_approved_by
        ].filter(Boolean);
        notificationConfig.title = `Work Order Completed`;
        notificationConfig.titleAr = `اكتمل أمر العمل`;
        notificationConfig.body = `Work order ${workOrder.code} has been fully approved and completed`;
        notificationConfig.bodyAr = `تم اعتماد وإنهاء أمر العمل ${workOrder.code} بالكامل`;
        break;

      case 'status_changed':
        // Notify reporter and assigned technician
        notificationConfig.userIds = [
          workOrder.reported_by,
          workOrder.assigned_to
        ].filter(Boolean);
        notificationConfig.title = `Work Order Updated`;
        notificationConfig.titleAr = `تحديث أمر العمل`;
        notificationConfig.body = `Work order ${workOrder.code} status has been updated`;
        notificationConfig.bodyAr = `تم تحديث حالة أمر العمل ${workOrder.code}`;
        break;
      
      case 'rejected_by_technician':
        // Notify engineers to reassign
        const { data: engineersForReject } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "maintenance_engineer")
          .eq("hospital_id", workOrder.hospital_id);
        
        notificationConfig.userIds = engineersForReject?.map(e => e.user_id) || [];
        notificationConfig.title = 'Work Order Rejected - Needs Reassignment';
        notificationConfig.titleAr = 'تم رفض البلاغ - يحتاج إعادة توجيه';
        notificationConfig.body = `Work order ${workOrder.code} has been rejected and needs reassignment`;
        notificationConfig.bodyAr = `تم رفض البلاغ ${workOrder.code} ويحتاج إعادة توجيه`;
        break;
    }

    // Remove duplicates and the performer from notification list
    notificationConfig.userIds = [...new Set(notificationConfig.userIds)].filter(id => id !== performedBy);

    if (notificationConfig.userIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send notifications to each user (with their preferred language)
    const notificationPromises = notificationConfig.userIds.map(async (userId) => {
      // Get user's preferred language (assuming English as default)
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name_ar")
        .eq("id", userId)
        .single();
      
      const isArabic = !!profile?.full_name_ar;
      
      // Call the send-push-notification function
      return fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          title: isArabic ? notificationConfig.titleAr : notificationConfig.title,
          body: isArabic ? notificationConfig.bodyAr : notificationConfig.body,
          data: {
            workOrderId,
            action,
            url: `/admin/work-orders/${workOrderId}`
          }
        })
      });
    });

    await Promise.all(notificationPromises);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifiedUsers: notificationConfig.userIds.length 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("Error in notify-work-order-updates function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
