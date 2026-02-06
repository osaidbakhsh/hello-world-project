import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dedup window in minutes (avoid spam)
const DEDUP_WINDOW_MINUTES = 60;

interface NotificationPayload {
  site_id: string;
  domain_id?: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  code: string;
  type: string;
  link?: string;
}

async function createDedupedNotification(
  supabaseAdmin: any,
  payload: NotificationPayload,
  dedupWindowMinutes: number = DEDUP_WINDOW_MINUTES
): Promise<boolean> {
  const dedupKey = `${payload.code}:${payload.entity_id}`;
  
  // Check if we recently sent this notification
  const { data: existing } = await supabaseAdmin
    .from('notification_dedup')
    .select('last_sent_at, count')
    .eq('dedup_key', dedupKey)
    .maybeSingle();

  const now = new Date();
  
  if (existing) {
    const lastSent = new Date(existing.last_sent_at);
    const minutesSinceLast = (now.getTime() - lastSent.getTime()) / (1000 * 60);
    
    if (minutesSinceLast < dedupWindowMinutes) {
      // Update count but don't send new notification
      await supabaseAdmin
        .from('notification_dedup')
        .update({ count: existing.count + 1 })
        .eq('dedup_key', dedupKey);
      return false;
    }
    
    // Update dedup record
    await supabaseAdmin
      .from('notification_dedup')
      .update({ 
        last_sent_at: now.toISOString(),
        count: existing.count + 1 
      })
      .eq('dedup_key', dedupKey);
  } else {
    // Create new dedup record
    await supabaseAdmin
      .from('notification_dedup')
      .insert({ dedup_key: dedupKey, last_sent_at: now.toISOString(), count: 1 });
  }

  // Create notification
  await supabaseAdmin
    .from('notifications')
    .insert({
      site_id: payload.site_id,
      domain_id: payload.domain_id,
      severity: payload.severity,
      title: payload.title,
      message: payload.message,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      code: payload.code,
      type: payload.type,
      link: payload.link,
      is_read: false,
    });

  return true;
}

async function createAuditLog(
  supabaseAdmin: any,
  action: string,
  tableName: string,
  recordId: string,
  newData: any
) {
  await supabaseAdmin.from('audit_logs').insert({
    action,
    table_name: tableName,
    record_id: recordId,
    new_data: newData,
    scope_type: 'maintenance',
  });
}

async function checkMaintenanceWindows(supabaseAdmin: any) {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  console.log(`Checking maintenance windows at ${now.toISOString()}`);
  
  // Find maintenance windows that are starting (within 5 min window)
  const { data: startingWindows, error: startError } = await supabaseAdmin
    .from('maintenance_windows')
    .select('id, title, site_id, domain_id, status, start_time, end_time')
    .eq('status', 'planned')
    .gte('start_time', fiveMinutesAgo.toISOString())
    .lte('start_time', fiveMinutesFromNow.toISOString());
  
  if (startError) {
    console.error('Error fetching starting windows:', startError);
  } else {
    for (const mw of startingWindows || []) {
      console.log(`Maintenance starting: ${mw.title} (${mw.id})`);
      
      // Update status to in_progress
      await supabaseAdmin
        .from('maintenance_windows')
        .update({ status: 'in_progress' })
        .eq('id', mw.id);
      
      // Create MAINT_START notification
      if (mw.site_id) {
        const sent = await createDedupedNotification(supabaseAdmin, {
          site_id: mw.site_id,
          domain_id: mw.domain_id,
          severity: 'warning',
          title: 'Maintenance Started',
          message: `Maintenance window "${mw.title}" has started.`,
          entity_type: 'maintenance',
          entity_id: mw.id,
          code: 'MAINT_START',
          type: 'alert',
          link: '/maintenance',
        });
        
        if (sent) {
          console.log(`Created MAINT_START notification for ${mw.id}`);
        }
      }
      
      // Create maintenance event
      await supabaseAdmin
        .from('maintenance_events')
        .insert({
          maintenance_id: mw.id,
          event_type: 'started',
          notes: `Maintenance window automatically started at ${now.toISOString()}`,
        });
      
      // Audit log
      await createAuditLog(supabaseAdmin, 'maintenance_started', 'maintenance_windows', mw.id, {
        title: mw.title,
        started_at: now.toISOString(),
      });
    }
  }
  
  // Find maintenance windows that are ending (in_progress and end_time passed)
  const { data: endingWindows, error: endError } = await supabaseAdmin
    .from('maintenance_windows')
    .select('id, title, site_id, domain_id, status, start_time, end_time')
    .eq('status', 'in_progress')
    .lte('end_time', now.toISOString());
  
  if (endError) {
    console.error('Error fetching ending windows:', endError);
  } else {
    for (const mw of endingWindows || []) {
      console.log(`Maintenance ending: ${mw.title} (${mw.id})`);
      
      // Update status to completed
      await supabaseAdmin
        .from('maintenance_windows')
        .update({ status: 'completed' })
        .eq('id', mw.id);
      
      // Create MAINT_END notification
      if (mw.site_id) {
        const sent = await createDedupedNotification(supabaseAdmin, {
          site_id: mw.site_id,
          domain_id: mw.domain_id,
          severity: 'info',
          title: 'Maintenance Completed',
          message: `Maintenance window "${mw.title}" has ended.`,
          entity_type: 'maintenance',
          entity_id: mw.id,
          code: 'MAINT_END',
          type: 'alert',
          link: '/maintenance',
        });
        
        if (sent) {
          console.log(`Created MAINT_END notification for ${mw.id}`);
        }
      }
      
      // Create maintenance event
      await supabaseAdmin
        .from('maintenance_events')
        .insert({
          maintenance_id: mw.id,
          event_type: 'completed',
          notes: `Maintenance window automatically completed at ${now.toISOString()}`,
        });
      
      // Audit log
      await createAuditLog(supabaseAdmin, 'maintenance_completed', 'maintenance_windows', mw.id, {
        title: mw.title,
        completed_at: now.toISOString(),
      });
    }
  }
  
  // Also check for windows that should start soon (upcoming reminders)
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
  const { data: upcomingWindows, error: upcomingError } = await supabaseAdmin
    .from('maintenance_windows')
    .select('id, title, site_id, domain_id, status, start_time')
    .eq('status', 'planned')
    .gte('start_time', fiveMinutesFromNow.toISOString())
    .lte('start_time', thirtyMinutesFromNow.toISOString());
  
  if (!upcomingError) {
    for (const mw of upcomingWindows || []) {
      if (mw.site_id) {
        // Send reminder with longer dedup window (2 hours)
        await createDedupedNotification(supabaseAdmin, {
          site_id: mw.site_id,
          domain_id: mw.domain_id,
          severity: 'info',
          title: 'Maintenance Reminder',
          message: `Maintenance window "${mw.title}" starts soon.`,
          entity_type: 'maintenance',
          entity_id: mw.id,
          code: 'MAINT_UPCOMING',
          type: 'reminder',
          link: '/maintenance',
        }, 120); // 2 hour dedup
      }
    }
  }
  
  return {
    checked_at: now.toISOString(),
    started: startingWindows?.length || 0,
    ended: endingWindows?.length || 0,
    upcoming: upcomingWindows?.length || 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Running maintenance check...');
    
    const result = await checkMaintenanceWindows(supabaseAdmin);
    
    console.log('Maintenance check completed:', result);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Maintenance check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Maintenance check failed', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
