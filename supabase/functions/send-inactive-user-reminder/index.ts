import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  inactiveDays?: number; // Default 30 days
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { inactiveDays = 30 }: EmailRequest = await req.json();

    console.log(`Checking for users inactive for ${inactiveDays} days...`);

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    // Get inactive users
    const { data: inactiveUsers, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        last_activity_at,
        hospitals(name, name_ar)
      `)
      .lt('last_activity_at', cutoffDate.toISOString());

    if (usersError) {
      console.error('Error fetching inactive users:', usersError);
      throw usersError;
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      console.log('No inactive users found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No inactive users found',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${inactiveUsers.length} inactive users`);

    // Send reminder emails
    const emailPromises = inactiveUsers.map(async (user: any) => {
      const lastActivity = user.last_activity_at 
        ? new Date(user.last_activity_at).toLocaleDateString('ar-SA')
        : 'غير معروف';

      const hospitalName = user.hospitals?.name_ar || user.hospitals?.name || 'المستشفى';

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .button { background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>تذكير بنشاطك في نظام الصيانة</h1>
            </div>
            <div class="content">
              <p>مرحباً ${user.full_name},</p>
              
              <p>نلاحظ أنك لم تسجل دخول إلى نظام الصيانة في ${hospitalName} منذ فترة طويلة.</p>
              
              <p><strong>آخر نشاط:</strong> ${lastActivity}</p>
              
              <p>نذكرك بأهمية متابعة أوامر العمل والمهام الموكلة إليك. يرجى تسجيل الدخول للتحقق من:</p>
              
              <ul>
                <li>أوامر العمل المعلقة</li>
                <li>المهام المطلوبة</li>
                <li>التحديثات الجديدة</li>
              </ul>
              
              <a href="${supabaseUrl.replace('/rest/v1', '')}/auth" class="button">تسجيل الدخول الآن</a>
              
              <p style="margin-top: 30px;">إذا كان لديك أي استفسار، يرجى التواصل مع مدير النظام.</p>
            </div>
            <div class="footer">
              <p>هذه رسالة تلقائية من نظام الصيانة</p>
              <p>${hospitalName}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await resend.emails.send({
          from: 'نظام الصيانة <no-reply@resend.dev>',
          to: user.email,
          subject: 'تذكير: عدم نشاط في نظام الصيانة',
          html: htmlContent,
        });

        console.log(`Reminder sent to ${user.email}`);
        return { success: true, email: user.email };
      } catch (error) {
        console.error(`Failed to send reminder to ${user.email}:`, error);
        return { success: false, email: user.email, error };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Sent ${successCount} reminders out of ${inactiveUsers.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} reminders to inactive users`,
        count: successCount,
        total: inactiveUsers.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-inactive-user-reminder:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});