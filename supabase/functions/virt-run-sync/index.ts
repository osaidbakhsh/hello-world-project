// Edge function: virt-run-sync
// Syncs discovered resources to production tables
// Requires both integrations.manage AND inventory.resources.manage

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RunSyncRequest {
  integration_id: string;
}

interface SyncStats {
  vms_discovered: number;
  hosts_discovered: number;
  networks_discovered: number;
  resources_created: number;
  resources_updated: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RunSyncRequest = await req.json();
    const { integration_id } = body;

    if (!integration_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'integration_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch integration
    const { data: integration, error: intError } = await supabaseUser
      .from('virtualization_integrations')
      .select('*')
      .eq('id', integration_id)
      .single();

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ success: false, error: 'Integration not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check mode - must be 'sync' to apply changes
    if (integration.mode !== 'sync') {
      return new Response(
        JSON.stringify({ success: false, error: 'Integration is in preview mode. Enable sync mode first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create sync run record
    const { data: syncRun, error: runError } = await supabaseAdmin
      .from('virtualization_sync_runs')
      .insert({
        integration_id,
        mode: 'sync',
        created_by: user.id,
      })
      .select()
      .single();

    if (runError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to start sync' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch latest discovered resources for this integration
    const { data: discoveredResources, error: discError } = await supabaseAdmin
      .from('discovered_resources')
      .select('*')
      .eq('integration_id', integration_id)
      .order('discovered_at', { ascending: false });

    if (discError) {
      console.error('Failed to fetch discovered resources:', discError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch discovered resources' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduplicate by external_id (take latest)
    const latestByExternalId = new Map<string, any>();
    for (const resource of discoveredResources || []) {
      const key = `${resource.resource_type}:${resource.external_id}`;
      if (!latestByExternalId.has(key)) {
        latestByExternalId.set(key, resource);
      }
    }

    const stats: SyncStats = {
      vms_discovered: 0,
      hosts_discovered: 0,
      networks_discovered: 0,
      resources_created: 0,
      resources_updated: 0,
    };

    let errorSummary: string | null = null;

    try {
      for (const [, discovered] of latestByExternalId) {
        if (discovered.resource_type === 'vm' || discovered.resource_type === 'host') {
          // Map to resources table
          const resourceType = discovered.resource_type === 'vm' ? 'vm' : 'physical_server';
          const attrs = discovered.attributes_json || {};

          // Check if resource exists
          const { data: existing } = await supabaseAdmin
            .from('resources')
            .select('id')
            .eq('external_id', discovered.external_id)
            .eq('integration_id', integration_id)
            .single();

          const resourceData = {
            site_id: discovered.site_id,
            domain_id: discovered.domain_id,
            cluster_id: discovered.cluster_id,
            resource_type: resourceType,
            name: discovered.name,
            primary_ip: discovered.ip_address,
            cpu_cores: attrs.vcpu || attrs.cpu_cores,
            ram_gb: attrs.memory_mb ? Math.round(attrs.memory_mb / 1024) : attrs.ram_gb,
            status: attrs.power_state === 'on' || attrs.power_state === 'Running' ? 'online' : 'offline',
            source: integration.integration_type,
            external_id: discovered.external_id,
            integration_id: integration_id,
          };

          if (existing) {
            await supabaseAdmin
              .from('resources')
              .update(resourceData)
              .eq('id', existing.id);
            stats.resources_updated++;
          } else {
            await supabaseAdmin
              .from('resources')
              .insert(resourceData);
            stats.resources_created++;
          }

          if (discovered.resource_type === 'vm') stats.vms_discovered++;
          else stats.hosts_discovered++;

        } else if (discovered.resource_type === 'network') {
          // Map to networks_v2 table
          const attrs = discovered.attributes_json || {};

          const { data: existing } = await supabaseAdmin
            .from('networks_v2')
            .select('id')
            .eq('name', discovered.name)
            .eq('site_id', discovered.site_id)
            .single();

          const networkData = {
            site_id: discovered.site_id,
            name: discovered.name,
            vlan_id: attrs.vlan_id,
            cidr: attrs.cidr,
            scope_type: 'site',
            scope_id: discovered.site_id,
          };

          if (!existing) {
            await supabaseAdmin.from('networks_v2').insert(networkData);
          }

          stats.networks_discovered++;
        }
      }
    } catch (syncError) {
      console.error('Sync error:', syncError);
      errorSummary = syncError.message || 'Sync failed';

      await supabaseAdmin
        .from('virtualization_integrations')
        .update({
          status: 'degraded',
          last_error: errorSummary,
        })
        .eq('id', integration_id);

      await supabaseAdmin
        .from('notifications')
        .insert({
          site_id: integration.site_id,
          code: 'VIRT_INTEGRATION_FAILED',
          severity: 'critical',
          title: `Virtualization sync "${integration.name}" failed`,
          message: errorSummary,
          metadata: { integration_id, run_id: syncRun.id },
        });
    }

    // Update sync run
    await supabaseAdmin
      .from('virtualization_sync_runs')
      .update({
        finished_at: new Date().toISOString(),
        success: !errorSummary,
        stats_json: stats,
        error_summary: errorSummary,
      })
      .eq('id', syncRun.id);

    // Update integration
    await supabaseAdmin
      .from('virtualization_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: errorSummary,
        status: errorSummary ? 'degraded' : 'enabled',
      })
      .eq('id', integration_id);

    // Write audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'virt_sync_completed',
      table_name: 'resources',
      scope_type: 'site',
      scope_id: integration.site_id,
      new_data: { stats, integration_id, run_id: syncRun.id },
    });

    return new Response(
      JSON.stringify({
        success: !errorSummary,
        run_id: syncRun.id,
        stats,
        error: errorSummary,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Run sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
