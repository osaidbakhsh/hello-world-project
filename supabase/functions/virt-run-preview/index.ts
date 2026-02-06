// Edge function: virt-run-preview
// Runs discovery against hypervisor and populates staging tables
// Does NOT write to production resources table

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RunPreviewRequest {
  integration_id: string;
}

interface SyncStats {
  vms_discovered: number;
  hosts_discovered: number;
  networks_discovered: number;
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

    // Create admin client for server-side operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create user client to verify permissions
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RunPreviewRequest = await req.json();
    const { integration_id } = body;

    if (!integration_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'integration_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch integration (RLS will verify access)
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

    // Create sync run record
    const { data: syncRun, error: runError } = await supabaseAdmin
      .from('virtualization_sync_runs')
      .insert({
        integration_id,
        mode: 'preview',
        created_by: user.id,
      })
      .select()
      .single();

    if (runError) {
      console.error('Failed to create sync run:', runError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to start preview' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch secrets using admin client (bypasses RLS)
    const { data: secrets } = await supabaseAdmin
      .from('integration_secrets')
      .select('*')
      .eq('integration_id', integration_id);

    // Run discovery based on integration type
    let stats: SyncStats = { vms_discovered: 0, hosts_discovered: 0, networks_discovered: 0 };
    let errorSummary: string | null = null;

    try {
      if (integration.integration_type === 'nutanix_prism') {
        stats = await discoverNutanix(supabaseAdmin, integration, secrets, syncRun.id);
      } else if (integration.integration_type === 'hyperv') {
        stats = await discoverHyperV(supabaseAdmin, integration, secrets, syncRun.id);
      }
    } catch (discoverError) {
      console.error('Discovery error:', discoverError);
      errorSummary = discoverError.message || 'Discovery failed';
      
      // Update integration status to degraded
      await supabaseAdmin
        .from('virtualization_integrations')
        .update({
          status: 'degraded',
          last_error: errorSummary,
        })
        .eq('id', integration_id);

      // Create notification for failure
      await supabaseAdmin
        .from('notifications')
        .insert({
          site_id: integration.site_id,
          code: 'VIRT_INTEGRATION_FAILED',
          severity: 'critical',
          title: `Virtualization integration "${integration.name}" preview failed`,
          message: errorSummary,
          metadata: { integration_id, run_id: syncRun.id },
        });
    }

    // Update sync run with results
    await supabaseAdmin
      .from('virtualization_sync_runs')
      .update({
        finished_at: new Date().toISOString(),
        success: !errorSummary,
        stats_json: stats,
        error_summary: errorSummary,
      })
      .eq('id', syncRun.id);

    // Update integration last_sync_at
    await supabaseAdmin
      .from('virtualization_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: errorSummary,
        status: errorSummary ? 'degraded' : integration.status,
      })
      .eq('id', integration_id);

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
    console.error('Run preview error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function discoverNutanix(
  supabase: any,
  integration: any,
  secrets: any[],
  runId: string
): Promise<SyncStats> {
  const config = integration.config_json || {};
  const stats: SyncStats = { vms_discovered: 0, hosts_discovered: 0, networks_discovered: 0 };
  const discoveredAt = new Date().toISOString();

  // In production, this would make real API calls to Prism
  // For preview/demo, we generate sample discovered resources
  
  // Simulated VMs discovery
  const sampleVMs = [
    { name: 'web-server-01', external_id: 'vm-uuid-001', ip_address: '10.0.1.10', power_state: 'on', vcpu: 4, memory_mb: 8192 },
    { name: 'db-server-01', external_id: 'vm-uuid-002', ip_address: '10.0.1.20', power_state: 'on', vcpu: 8, memory_mb: 32768 },
    { name: 'app-server-01', external_id: 'vm-uuid-003', ip_address: '10.0.1.30', power_state: 'on', vcpu: 4, memory_mb: 16384 },
  ];

  for (const vm of sampleVMs) {
    await supabase.from('discovered_resources').insert({
      integration_id: integration.id,
      run_id: runId,
      site_id: integration.site_id,
      discovered_at: discoveredAt,
      resource_type: 'vm',
      external_id: vm.external_id,
      name: vm.name,
      ip_address: vm.ip_address,
      attributes_json: {
        power_state: vm.power_state,
        vcpu: vm.vcpu,
        memory_mb: vm.memory_mb,
      },
      diff_action: 'create', // Would compute actual diff against existing resources
    });
    stats.vms_discovered++;
  }

  // Simulated hosts discovery
  const sampleHosts = [
    { name: 'nutanix-host-01', external_id: 'host-uuid-001', ip_address: '10.0.0.1', cpu_cores: 32, ram_gb: 256 },
    { name: 'nutanix-host-02', external_id: 'host-uuid-002', ip_address: '10.0.0.2', cpu_cores: 32, ram_gb: 256 },
  ];

  for (const host of sampleHosts) {
    await supabase.from('discovered_resources').insert({
      integration_id: integration.id,
      run_id: runId,
      site_id: integration.site_id,
      discovered_at: discoveredAt,
      resource_type: 'host',
      external_id: host.external_id,
      name: host.name,
      ip_address: host.ip_address,
      attributes_json: {
        cpu_cores: host.cpu_cores,
        ram_gb: host.ram_gb,
      },
      diff_action: 'create',
    });
    stats.hosts_discovered++;
  }

  // Simulated networks discovery
  const sampleNetworks = [
    { name: 'VLAN-100-Prod', external_id: 'subnet-uuid-001', vlan_id: 100, cidr: '10.0.1.0/24' },
    { name: 'VLAN-200-Dev', external_id: 'subnet-uuid-002', vlan_id: 200, cidr: '10.0.2.0/24' },
  ];

  for (const network of sampleNetworks) {
    await supabase.from('discovered_resources').insert({
      integration_id: integration.id,
      run_id: runId,
      site_id: integration.site_id,
      discovered_at: discoveredAt,
      resource_type: 'network',
      external_id: network.external_id,
      name: network.name,
      attributes_json: {
        vlan_id: network.vlan_id,
        cidr: network.cidr,
      },
      diff_action: 'create',
    });
    stats.networks_discovered++;
  }

  return stats;
}

async function discoverHyperV(
  supabase: any,
  integration: any,
  secrets: any[],
  runId: string
): Promise<SyncStats> {
  const stats: SyncStats = { vms_discovered: 0, hosts_discovered: 0, networks_discovered: 0 };
  const discoveredAt = new Date().toISOString();

  // Simulated Hyper-V discovery
  const sampleVMs = [
    { name: 'hyperv-vm-01', external_id: 'hyperv-vm-001', ip_address: '192.168.1.10', state: 'Running', cpu: 2, memory_mb: 4096 },
    { name: 'hyperv-vm-02', external_id: 'hyperv-vm-002', ip_address: '192.168.1.11', state: 'Running', cpu: 4, memory_mb: 8192 },
  ];

  for (const vm of sampleVMs) {
    await supabase.from('discovered_resources').insert({
      integration_id: integration.id,
      run_id: runId,
      site_id: integration.site_id,
      discovered_at: discoveredAt,
      resource_type: 'vm',
      external_id: vm.external_id,
      name: vm.name,
      ip_address: vm.ip_address,
      attributes_json: {
        power_state: vm.state,
        vcpu: vm.cpu,
        memory_mb: vm.memory_mb,
      },
      diff_action: 'create',
    });
    stats.vms_discovered++;
  }

  return stats;
}
