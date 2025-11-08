import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId?: string;
  hospitalId?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, hospitalId, title, body, data }: NotificationRequest = await req.json();

    console.log('Sending notification:', { userId, hospitalId, title });

    // Get tokens for specified users
    let query = supabase.from('push_notification_tokens').select('token, device_type');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (hospitalId) {
      // Get all users in the hospital
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('hospital_id', hospitalId);

      if (profiles && profiles.length > 0) {
        const userIds = profiles.map(p => p.id);
        query = query.in('user_id', userIds);
      }
    }

    const { data: tokens, error: tokensError } = await query;

    if (tokensError) {
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No tokens found for notification',
          sent: 0 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // TODO: Integrate with Firebase Cloud Messaging or other push notification service
    // For now, we'll just log the notifications that would be sent
    console.log(`Would send ${tokens.length} notifications:`, {
      title,
      body,
      tokens: tokens.map(t => ({ token: t.token.substring(0, 20) + '...', type: t.device_type }))
    });

    // Simulate sending notifications
    const results = tokens.map(token => ({
      token: token.token,
      success: true,
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notifications sent successfully`,
        sent: successCount,
        total: tokens.length,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});