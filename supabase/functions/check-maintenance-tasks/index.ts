import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Starting maintenance tasks check...");

    const today = new Date().toISOString().split('T')[0];

    // Get overdue tasks
    const { data: overdueTasks, error: overdueError } = await supabase
      .from("maintenance_tasks")
      .select(`
        *,
        maintenance_plans!inner(hospital_id)
      `)
      .lt("end_date", today)
      .neq("status", "completed")
      .neq("status", "cancelled");

    if (overdueError) {
      console.error("Error fetching overdue tasks:", overdueError);
      throw overdueError;
    }

    console.log(`Found ${overdueTasks?.length || 0} overdue tasks`);

    // Process overdue tasks
    for (const task of overdueTasks || []) {
      // Get assigned team members
      if (task.assigned_to) {
        const { data: teamMembers } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", task.assigned_to);

        for (const member of teamMembers || []) {
          // Check if notification already sent today
          const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", member.user_id)
            .eq("related_task_id", task.id)
            .eq("type", "overdue_task")
            .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
            .single();

          if (!existingNotif) {
            await supabase.functions.invoke("send-notification-email", {
              body: {
                userId: member.user_id,
                title: "Overdue Maintenance Task",
                titleAr: "مهمة صيانة متأخرة",
                message: `Task "${task.name}" is overdue. It was due on ${task.end_date}.`,
                messageAr: `المهمة "${task.name_ar}" متأخرة. كان من المفترض إنجازها في ${task.end_date}.`,
                type: "overdue_task",
                relatedTaskId: task.id,
              },
            });
            console.log(`Sent overdue notification for task ${task.code} to user ${member.user_id}`);
          }
        }
      }
    }

    // Get upcoming tasks (based on user preferences, default 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const upcomingDate = threeDaysFromNow.toISOString().split('T')[0];

    const { data: upcomingTasks, error: upcomingError } = await supabase
      .from("maintenance_tasks")
      .select(`
        *,
        maintenance_plans!inner(hospital_id)
      `)
      .gte("start_date", today)
      .lte("start_date", upcomingDate)
      .neq("status", "completed")
      .neq("status", "cancelled");

    if (upcomingError) {
      console.error("Error fetching upcoming tasks:", upcomingError);
      throw upcomingError;
    }

    console.log(`Found ${upcomingTasks?.length || 0} upcoming tasks`);

    // Process upcoming tasks
    for (const task of upcomingTasks || []) {
      if (task.assigned_to) {
        const { data: teamMembers } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", task.assigned_to);

        for (const member of teamMembers || []) {
          // Check preferences
          const { data: prefs } = await supabase
            .from("notification_preferences")
            .select("upcoming_tasks")
            .eq("user_id", member.user_id)
            .single();

          if (prefs?.upcoming_tasks !== false) {
            // Check if notification already sent today
            const { data: existingNotif } = await supabase
              .from("notifications")
              .select("id")
              .eq("user_id", member.user_id)
              .eq("related_task_id", task.id)
              .eq("type", "upcoming_task")
              .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
              .single();

            if (!existingNotif) {
              await supabase.functions.invoke("send-notification-email", {
                body: {
                  userId: member.user_id,
                  title: "Upcoming Maintenance Task",
                  titleAr: "مهمة صيانة قادمة",
                  message: `Task "${task.name}" is starting soon on ${task.start_date}.`,
                  messageAr: `المهمة "${task.name_ar}" ستبدأ قريباً في ${task.start_date}.`,
                  type: "upcoming_task",
                  relatedTaskId: task.id,
                },
              });
              console.log(`Sent upcoming notification for task ${task.code} to user ${member.user_id}`);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        overdueCount: overdueTasks?.length || 0,
        upcomingCount: upcomingTasks?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-maintenance-tasks:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});