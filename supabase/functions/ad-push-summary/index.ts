import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
};

interface ADSummaryPayload {
  siteCode: string;
  domainFqdn: string;
  capturedAt: string;
  users: {
    total: number;
    enabled: number;
    disabled: number;
    locked: number;
  };
  password: {
    expired: number;
    expiringIn7d: number;
    expiringIn14d: number;
    expiringIn30d: number;
    neverExpires: number;
  };
  computers: {
    total: number;
    enabled: number;
    stale30d: number;
    stale60d: number;
    stale90d: number;
  };
  groups: {
    total: number;
    privileged: number;
  };
  dcs: {
    total: number;
    down: number;
  };
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validateAgent(supabaseAdmin: any, agentKey: string): Promise<{ agent: any; error: string | null }> {
  const keyHash = await hashToken(agentKey);
  
  const { data: agent, error } = await supabaseAdmin
    .from('scan_agents')
    .select('*')
    .eq('auth_token_hash', keyHash)
    .maybeSingle();

  if (error || !agent) {
    return { agent: null, error: 'Invalid agent key' };
  }

  return { agent, error: null };
}

async function resolveEntities(
  supabaseAdmin: any, 
  siteCode: string, 
  domainFqdn: string
): Promise<{ siteId: string | null; domainId: string | null; error: string | null }> {
  // Resolve site by code
  const { data: site, error: siteError } = await supabaseAdmin
    .from('sites')
    .select('id')
    .eq('code', siteCode)
    .maybeSingle();

  if (siteError || !site) {
    return { siteId: null, domainId: null, error: `Site not found: ${siteCode}` };
  }

  // Resolve domain by FQDN (or name as fallback)
  let { data: domain } = await supabaseAdmin
    .from('domains')
    .select('id, site_id')
    .eq('fqdn', domainFqdn)
    .eq('site_id', site.id)
    .maybeSingle();

  // Fallback to name match
  if (!domain) {
    const { data: domainByName } = await supabaseAdmin
      .from('domains')
      .select('id, site_id')
      .eq('name', domainFqdn.split('.')[0])
      .eq('site_id', site.id)
      .maybeSingle();
    domain = domainByName;
  }

  if (!domain) {
    return { siteId: site.id, domainId: null, error: `Domain not found: ${domainFqdn} in site ${siteCode}` };
  }

  if (domain.site_id !== site.id) {
    return { siteId: null, domainId: null, error: 'Domain does not belong to specified site' };
  }

  return { siteId: site.id, domainId: domain.id, error: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate agent authentication
    const agentKey = req.headers.get('x-agent-key');
    if (!agentKey) {
      return new Response(
        JSON.stringify({ error: 'Missing agent key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { agent, error: authError } = await validateAgent(supabaseAdmin, agentKey);
    if (authError) {
      return new Response(
        JSON.stringify({ error: authError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate payload
    let payload: ADSummaryPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!payload.siteCode || !payload.domainFqdn || !payload.capturedAt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: siteCode, domainFqdn, capturedAt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve site and domain
    const { siteId, domainId, error: resolveError } = await resolveEntities(
      supabaseAdmin,
      payload.siteCode,
      payload.domainFqdn
    );

    if (resolveError) {
      return new Response(
        JSON.stringify({ error: resolveError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create domain integration
    let { data: integration } = await supabaseAdmin
      .from('domain_integrations')
      .select('id')
      .eq('domain_id', domainId)
      .eq('integration_type', 'active_directory')
      .maybeSingle();

    if (!integration) {
      // Auto-create integration record
      const { data: newIntegration, error: createError } = await supabaseAdmin
        .from('domain_integrations')
        .insert({
          site_id: siteId,
          domain_id: domainId,
          integration_type: 'active_directory',
          mode: 'push',
          agent_id: agent.id,
          status: 'enabled',
          health_status: 'healthy',
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating integration:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create integration record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      integration = newIntegration;
    }

    // Start integration run
    const runStartedAt = new Date().toISOString();
    const { data: run, error: runError } = await supabaseAdmin
      .from('integration_runs')
      .insert({
        integration_id: integration.id,
        run_type: 'push',
        started_at: runStartedAt,
        created_by: 'agent',
      })
      .select('id')
      .single();

    if (runError) {
      console.error('Error creating integration run:', runError);
    }

    // Insert AD snapshot
    const capturedAt = new Date(payload.capturedAt).toISOString();
    const { error: snapshotError } = await supabaseAdmin
      .from('ad_snapshots')
      .upsert({
        site_id: siteId,
        domain_id: domainId,
        captured_at: capturedAt,
        users_total: payload.users?.total || 0,
        users_enabled: payload.users?.enabled || 0,
        users_disabled: payload.users?.disabled || 0,
        users_locked: payload.users?.locked || 0,
        pwd_expired: payload.password?.expired || 0,
        pwd_expiring_7d: payload.password?.expiringIn7d || 0,
        pwd_expiring_14d: payload.password?.expiringIn14d || 0,
        pwd_expiring_30d: payload.password?.expiringIn30d || 0,
        pwd_never_expires: payload.password?.neverExpires || 0,
        computers_total: payload.computers?.total || 0,
        computers_enabled: payload.computers?.enabled || 0,
        computers_stale_30d: payload.computers?.stale30d || 0,
        computers_stale_60d: payload.computers?.stale60d || 0,
        computers_stale_90d: payload.computers?.stale90d || 0,
        groups_total: payload.groups?.total || 0,
        privileged_groups_total: payload.groups?.privileged || 0,
        dcs_total: payload.dcs?.total || 0,
        dcs_down: payload.dcs?.down || 0,
        last_successful_sync_at: new Date().toISOString(),
      }, { onConflict: 'domain_id,captured_at' });

    if (snapshotError) {
      console.error('Error upserting snapshot:', snapshotError);
      
      // Mark run as failed
      if (run) {
        await supabaseAdmin
          .from('integration_runs')
          .update({
            finished_at: new Date().toISOString(),
            success: false,
            error_summary: snapshotError.message,
          })
          .eq('id', run.id);
      }

      return new Response(
        JSON.stringify({ error: 'Failed to store snapshot', details: snapshotError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark run as successful
    if (run) {
      await supabaseAdmin
        .from('integration_runs')
        .update({
          finished_at: new Date().toISOString(),
          success: true,
          metrics_json: {
            users_total: payload.users?.total || 0,
            computers_total: payload.computers?.total || 0,
            groups_total: payload.groups?.total || 0,
            dcs_total: payload.dcs?.total || 0,
          },
        })
        .eq('id', run.id);
    }

    // Update integration status
    await supabaseAdmin
      .from('domain_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        health_status: 'healthy',
        agent_id: agent.id,
      })
      .eq('id', integration.id);

    // Update agent last_seen
    await supabaseAdmin
      .from('scan_agents')
      .update({
        status: 'ONLINE',
        last_seen_at: new Date().toISOString(),
        offline_since: null,
      })
      .eq('id', agent.id);

    // Get previous snapshot for comparison (anomaly detection)
    const { data: prevSnapshot } = await supabaseAdmin
      .from('ad_snapshots')
      .select('*')
      .eq('domain_id', domainId)
      .lt('captured_at', capturedAt)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get thresholds from integration config
    const thresholds = (integration as any).config_json?.thresholds || {
      lockoutSpikeAbs: 10,
      lockoutSpikePct: 50,
      pwdExpiredThreshold: 50,
      pwdExpiring7dThreshold: 100,
      stale90dThreshold: 100,
    };

    // Helper function to create deduplicated notifications
    async function createDedupedNotification(
      code: string,
      severity: 'info' | 'warning' | 'critical',
      title: string,
      message: string
    ) {
      const dedupKey = `${code}:${domainId}`;
      const dedupWindowMinutes = severity === 'critical' ? 30 : 60;
      
      // Check dedup
      const { data: existing } = await supabaseAdmin
        .from('notification_dedup')
        .select('last_sent_at')
        .eq('dedup_key', dedupKey)
        .maybeSingle();

      const now = new Date();
      if (existing) {
        const lastSent = new Date(existing.last_sent_at);
        const minutesSinceLast = (now.getTime() - lastSent.getTime()) / (1000 * 60);
        if (minutesSinceLast < dedupWindowMinutes) {
          return false;
        }
        await supabaseAdmin
          .from('notification_dedup')
          .update({ last_sent_at: now.toISOString() })
          .eq('dedup_key', dedupKey);
      } else {
        await supabaseAdmin
          .from('notification_dedup')
          .insert({ dedup_key: dedupKey, last_sent_at: now.toISOString() });
      }

      await supabaseAdmin
        .from('notifications')
        .insert({
          site_id: siteId,
          domain_id: domainId,
          severity,
          title,
          message,
          entity_type: 'ad_snapshot',
          entity_id: domainId,
          code,
          type: severity === 'critical' ? 'alert' : 'warning',
          link: `/ad-overview/${domainId}`,
          is_read: false,
        });
      return true;
    }

    // Check for anomalies
    const anomalies: { code: string; severity: 'warning' | 'critical'; title: string; message: string }[] = [];
    
    // DC down - critical
    if ((payload.dcs?.down || 0) > 0) {
      anomalies.push({
        code: 'AD_DC_DOWN',
        severity: 'critical',
        title: 'Domain Controller Down',
        message: `${payload.dcs.down} Domain Controller(s) down in ${payload.domainFqdn}`,
      });
    }

    // Lockout spike detection
    const currentLocked = payload.users?.locked || 0;
    const prevLocked = prevSnapshot?.users_locked || 0;
    const lockoutIncrease = currentLocked - prevLocked;
    const lockoutPctIncrease = prevLocked > 0 ? (lockoutIncrease / prevLocked) * 100 : 0;
    
    if (lockoutIncrease > thresholds.lockoutSpikeAbs || lockoutPctIncrease > thresholds.lockoutSpikePct) {
      anomalies.push({
        code: 'AD_LOCKOUT_SPIKE',
        severity: lockoutIncrease > thresholds.lockoutSpikeAbs * 2 ? 'critical' : 'warning',
        title: 'Account Lockout Spike',
        message: `${currentLocked} accounts locked (${lockoutIncrease > 0 ? '+' : ''}${lockoutIncrease} since last sync) in ${payload.domainFqdn}`,
      });
    }

    // Password expired threshold
    if ((payload.password?.expired || 0) > thresholds.pwdExpiredThreshold) {
      anomalies.push({
        code: 'AD_PWD_EXPIRED',
        severity: 'warning',
        title: 'Passwords Expired Alert',
        message: `${payload.password.expired} passwords expired in ${payload.domainFqdn}`,
      });
    }

    // Password expiring soon
    if ((payload.password?.expiringIn7d || 0) > thresholds.pwdExpiring7dThreshold) {
      anomalies.push({
        code: 'AD_PWD_EXPIRING',
        severity: 'warning',
        title: 'Passwords Expiring Soon',
        message: `${payload.password.expiringIn7d} passwords expiring in 7 days in ${payload.domainFqdn}`,
      });
    }

    // Stale computers
    if ((payload.computers?.stale90d || 0) > thresholds.stale90dThreshold) {
      anomalies.push({
        code: 'AD_STALE_COMPUTERS',
        severity: 'warning',
        title: 'Stale Computers Alert',
        message: `${payload.computers.stale90d} computers inactive for 90+ days in ${payload.domainFqdn}`,
      });
    }

    // Create notifications for anomalies
    const notificationsCreated: string[] = [];
    for (const anomaly of anomalies) {
      const created = await createDedupedNotification(
        anomaly.code,
        anomaly.severity,
        anomaly.title,
        anomaly.message
      );
      if (created) {
        notificationsCreated.push(anomaly.code);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        integration_id: integration.id,
        run_id: run?.id,
        captured_at: capturedAt,
        anomalies: anomalies.length > 0 ? anomalies.map(a => a.message) : undefined,
        notifications_created: notificationsCreated.length > 0 ? notificationsCreated : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('AD push summary error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
