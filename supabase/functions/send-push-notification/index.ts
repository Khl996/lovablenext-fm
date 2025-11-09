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

    // Send push notifications using Firebase Cloud Messaging
    const serverKey = Deno.env.get('FIREBASE_SERVER_KEY');
    if (!serverKey) {
      console.warn('FIREBASE_SERVER_KEY not configured, simulating notifications');
      // Simulate sending for development
      const results = tokens.map(token => ({
        token: token.token,
        success: true,
        messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Notifications simulated (no Firebase key)`,
          sent: results.length,
          total: tokens.length,
          results
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Sending ${tokens.length} real notifications via FCM:`, { title, body });

    const results = await Promise.all(
      tokens.map(async (tokenRecord) => {
        try {
          const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Authorization': `key=${serverKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: tokenRecord.token,
              notification: {
                title,
                body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
              },
              data: data || {
                url: '/dashboard'
              }
            }),
          });

          const result = await response.json();
          
          if (result.success === 1) {
            console.log(`✅ Sent to ${tokenRecord.device_type}: ${tokenRecord.token.substring(0, 20)}...`);
            return {
              token: tokenRecord.token,
              success: true,
              messageId: result.results[0].message_id
            };
          } else {
            console.error(`❌ Failed to send: ${tokenRecord.token.substring(0, 20)}...`, result);
            return {
              token: tokenRecord.token,
              success: false,
              error: result.results[0].error
            };
          }
        } catch (error) {
          console.error(`❌ Exception sending: ${tokenRecord.token.substring(0, 20)}...`, error);
          return {
            token: tokenRecord.token,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

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