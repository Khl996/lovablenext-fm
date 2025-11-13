import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Running auto-close work orders job...');

    // Call the database function to auto-close work orders
    const { error: functionError } = await supabase.rpc('auto_close_pending_work_orders');

    if (functionError) {
      console.error('Error calling auto_close_pending_work_orders:', functionError);
      throw functionError;
    }

    // Get the work orders that were just auto-closed
    const { data: autoClosedOrders, error: fetchError } = await supabase
      .from('work_orders')
      .select(`
        id,
        code,
        issue_type,
        reported_by,
        auto_closed_at
      `)
      .eq('status', 'auto_closed')
      .gte('auto_closed_at', new Date(Date.now() - 60000).toISOString()); // Last minute

    if (fetchError) {
      console.error('Error fetching auto-closed orders:', fetchError);
      throw fetchError;
    }

    console.log(`Auto-closed ${autoClosedOrders?.length || 0} work orders`);

    // Send notifications to reporters
    if (autoClosedOrders && autoClosedOrders.length > 0) {
      for (const order of autoClosedOrders) {
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              userId: order.reported_by,
              title: 'تم إغلاق البلاغ تلقائياً',
              body: `تم إغلاق البلاغ ${order.code} تلقائياً بعد مرور 24 ساعة`,
              data: {
                workOrderId: order.id,
                action: 'auto_closed',
              },
            },
          });
        } catch (notifError) {
          console.error(`Failed to send notification for order ${order.code}:`, notifError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-closed ${autoClosedOrders?.length || 0} work orders`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in auto-close-work-orders:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
