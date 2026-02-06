import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default thresholds (can be overridden per integration via config_json)
const DEFAULT_THRESHOLDS = {
  agentOfflineMinutes: 5,
  integrationStaleMinutes: 60,
  integrationDownMinutes: 180,
};

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
  dedupWindowMinutes: number = 60
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
      .insert({ dedup_key: dedupKey, last_sent_at: now.toISOString() });
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

async function checkAgentHealth(supabaseAdmin: any) {
  const now = new Date();
  const offlineThreshold = new Date(now.getTime() - DEFAULT_THRESHOLDS.agentOfflineMinutes * 60 * 1000);

  // Find agents that should be marked offline
  const { data: staleAgents, error: agentsError } = await supabaseAdmin
    .from('scan_agents')
    .select('id, name, site_id, domain_id, status, last_seen_at, offline_since')
    .neq('status', 'OFFLINE')
    .lt('last_seen_at', offlineThreshold.toISOString());

  if (agentsError) {
    console.error('Error fetching stale agents:', agentsError);
    return;
  }

  for (const agent of staleAgents || []) {
    // Mark agent as offline
    const { error: updateError } = await supabaseAdmin
      .from('scan_agents')
      .update({
        status: 'OFFLINE',
        offline_since: now.toISOString(),
      })
      .eq('id', agent.id);

    if (updateError) {
      console.error('Error marking agent offline:', updateError);
      continue;
    }

    // Log offline event
    await supabaseAdmin
      .from('agent_events')
      .insert({
        agent_id: agent.id,
        domain_id: agent.domain_id,
        event_type: 'offline',
        payload: {
          last_seen_at: agent.last_seen_at,
          offline_since: now.toISOString(),
        },
      });

    // Create notification
    if (agent.site_id) {
      await createDedupedNotification(supabaseAdmin, {
        site_id: agent.site_id,
        domain_id: agent.domain_id,
        severity: 'critical',
        title: 'Agent Offline',
        message: `Agent "${agent.name}" has not sent a heartbeat in ${DEFAULT_THRESHOLDS.agentOfflineMinutes} minutes.`,
        entity_type: 'agent',
        entity_id: agent.id,
        code: 'AGENT_OFFLINE',
        type: 'alert',
        link: '/integrations/agents',
      }, 60);
    }
  }

  console.log(`Processed ${staleAgents?.length || 0} stale agents`);
}

async function checkIntegrationHealth(supabaseAdmin: any) {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - DEFAULT_THRESHOLDS.integrationStaleMinutes * 60 * 1000);
  const downThreshold = new Date(now.getTime() - DEFAULT_THRESHOLDS.integrationDownMinutes * 60 * 1000);

  // Find enabled integrations that are stale
  const { data: integrations, error: intError } = await supabaseAdmin
    .from('domain_integrations')
    .select(`
      id, 
      site_id, 
      domain_id, 
      health_status, 
      last_sync_at, 
      config_json,
      domains!inner(name)
    `)
    .eq('status', 'enabled')
    .lt('last_sync_at', staleThreshold.toISOString());

  if (intError) {
    console.error('Error fetching stale integrations:', intError);
    return;
  }

  for (const integration of integrations || []) {
    const lastSync = new Date(integration.last_sync_at);
    const isDown = lastSync < downThreshold;
    const newStatus = isDown ? 'down' : 'degraded';

    // Skip if already at this status
    if (integration.health_status === newStatus) continue;

    // Update integration status
    await supabaseAdmin
      .from('domain_integrations')
      .update({ health_status: newStatus })
      .eq('id', integration.id);

    // Create notification
    const domainName = (integration as any).domains?.name || 'Unknown domain';
    await createDedupedNotification(supabaseAdmin, {
      site_id: integration.site_id,
      domain_id: integration.domain_id,
      severity: isDown ? 'critical' : 'warning',
      title: isDown ? 'Integration Down' : 'Integration Degraded',
      message: `AD integration for ${domainName} has not synced in ${Math.round((now.getTime() - lastSync.getTime()) / (1000 * 60))} minutes.`,
      entity_type: 'domain_integration',
      entity_id: integration.id,
      code: isDown ? 'INTEGRATION_DOWN' : 'INTEGRATION_STALE',
      type: 'alert',
      link: `/ad-overview/${integration.domain_id}`,
    }, isDown ? 30 : 60);
  }

  console.log(`Processed ${integrations?.length || 0} stale integrations`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting health check...');
    
    // Check agent health
    await checkAgentHealth(supabaseAdmin);
    
    // Check integration health
    await checkIntegrationHealth(supabaseAdmin);

    console.log('Health check completed');

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Health check completed',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Health check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
