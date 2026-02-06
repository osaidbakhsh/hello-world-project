import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HARD-CODED OWNER EMAIL - only this user can trigger reset
const ALLOWED_OWNER_EMAIL = 'osaidbakhsh@gmail.com';

// Tables to truncate in order (respecting foreign key dependencies)
const TABLES_TO_TRUNCATE = [
  // Virtualization module
  'discovered_resources',
  'virtualization_sync_runs',
  'integration_secrets',
  'virtualization_integrations',
  
  // Agent/scan module
  'scan_results',
  'scan_snapshots',
  'fileshare_scans',
  'folder_stats',
  'scan_jobs',
  'agent_events',
  'scan_agents',
  
  // File shares
  'file_shares',
  
  // Notifications
  'notification_dedup',
  'notifications',
  
  // Approvals
  'approval_events',
  'approval_requests',
  
  // Audit logs
  'vault_audit_logs',
  'audit_logs',
  
  // Vault
  'vault_permissions',
  'vault_item_secrets',
  'vault_items',
  'vault_settings',
  'user_private_vault',
  
  // Infrastructure credentials
  'infra_credential_access_logs',
  'infrastructure_credentials',
  'infra_snapshots',
  'infrastructure_alerts',
  
  // Tasks
  'task_comments',
  'tasks',
  'task_templates',
  
  // Maintenance
  'maintenance_events',
  'change_requests',
  'maintenance_windows',
  
  // On-call
  'on_call_assignments',
  'escalation_rules',
  'on_call_schedules',
  
  // Vacations
  'vacations',
  'vacation_balances',
  'yearly_goals',
  
  // Employee reports
  'report_upload_rows',
  'report_uploads',
  'employee_reports',
  
  // Procurement
  'procurement_activity_logs',
  'procurement_quotations',
  'procurement_request_items',
  'procurement_requests',
  'purchase_requests',
  
  // Licenses
  'licenses',
  
  // AD Integration
  'domain_integrations',
  'ad_users',
  'ad_groups',
  'ad_computers',
  'ad_domain_controllers',
  'ad_snapshots',
  
  // Connection tests
  'connection_test_runs',
  'ldap_configs',
  'ntp_configs',
  'mail_configs',
  
  // Import batches
  'import_batches',
  
  // Resources (order matters)
  'resource_vm_details',
  'resource_server_details',
  'resources',
  'integration_runs',
  'system_health_checks',
  
  // Web apps
  'website_applications',
  
  // Infrastructure hierarchy (order matters)
  'vms',
  'servers',
  'networks',
  'networks_v2',
  'cluster_nodes',
  'clusters',
  'datacenters',
  
  // Manager assignments (before profiles cleanup)
  'manager_assignments',
  
  // Domain memberships and memberships (before domains/sites)
  'domain_memberships',
  'site_memberships',
  
  // Domains (after memberships)
  'domains',
  
  // Sites (after domains)
  'sites',
];

// Seed data configuration
const SEED_SITES = [
  { name: 'Riyadh HQ', code: 'RUH', city: 'Riyadh', region: 'Central', timezone: 'Asia/Riyadh' },
  { name: 'Jeddah Branch', code: 'JED', city: 'Jeddah', region: 'Western', timezone: 'Asia/Riyadh' },
  { name: 'Dammam Office', code: 'DMM', city: 'Dammam', region: 'Eastern', timezone: 'Asia/Riyadh' },
];

const SEED_DOMAINS = [
  { name: 'corp.local', description: 'Primary corporate domain', code: 'CORP', siteCode: 'RUH' },
  { name: 'dev.local', description: 'Development environment domain', code: 'DEV', siteCode: 'RUH' },
  { name: 'branch.local', description: 'Branch office domain', code: 'BRANCH', siteCode: 'JED' },
  { name: 'dmz.local', description: 'DMZ and security services', code: 'DMZ', siteCode: 'DMM' },
];

const SEED_DATACENTERS = [
  { name: 'DC-RUH-01', location: 'Riyadh King Fahd Business Park', siteCode: 'RUH', domainCode: 'CORP' },
  { name: 'DC-JED-01', location: 'Jeddah Tech Hub', siteCode: 'JED', domainCode: 'BRANCH' },
  { name: 'DC-DMM-01', location: 'Dammam Industrial Zone', siteCode: 'DMM', domainCode: 'DMZ' },
];

const SEED_CLUSTERS = [
  { name: 'NUTANIX-PROD-01', datacenterName: 'DC-RUH-01', cluster_type: 'nutanix', vendor: 'Nutanix', platform_version: 'AOS 6.5.2', node_count: 4 },
  { name: 'VMWARE-DEV-01', datacenterName: 'DC-RUH-01', cluster_type: 'vmware', vendor: 'VMware', platform_version: 'vSphere 8.0', node_count: 3 },
  { name: 'HYPERV-SEC-01', datacenterName: 'DC-DMM-01', cluster_type: 'hyperv', vendor: 'Microsoft', platform_version: 'WS 2022', node_count: 2 },
];

const SEED_NETWORKS = [
  { name: 'PROD-NET-10', subnet: '10.10.0.0/24', gateway: '10.10.0.1', dns_servers: ['10.10.0.10'], clusterName: 'NUTANIX-PROD-01', domainCode: 'CORP' },
  { name: 'MGMT-NET-20', subnet: '10.20.0.0/24', gateway: '10.20.0.1', dns_servers: ['10.10.0.10'], clusterName: 'NUTANIX-PROD-01', domainCode: 'CORP' },
  { name: 'DEV-NET-30', subnet: '10.30.0.0/24', gateway: '10.30.0.1', dns_servers: ['10.10.0.10'], clusterName: 'VMWARE-DEV-01', domainCode: 'DEV' },
  { name: 'DMZ-NET-40', subnet: '10.40.0.0/24', gateway: '10.40.0.1', dns_servers: ['8.8.8.8'], clusterName: 'HYPERV-SEC-01', domainCode: 'DMZ' },
];

const SEED_SERVERS = [
  // Production servers
  { name: 'DC01', ip_address: '10.10.0.10', os: 'Windows Server 2022', environment: 'production', status: 'active', networkName: 'PROD-NET-10', server_role: ['DC', 'DNS'] },
  { name: 'DC02', ip_address: '10.10.0.11', os: 'Windows Server 2022', environment: 'production', status: 'active', networkName: 'PROD-NET-10', server_role: ['DC', 'DNS'] },
  { name: 'FILE01', ip_address: '10.10.0.20', os: 'Windows Server 2022', environment: 'production', status: 'active', networkName: 'PROD-NET-10', server_role: ['File'] },
  { name: 'SQL01', ip_address: '10.10.0.30', os: 'Windows Server 2022', environment: 'production', status: 'active', networkName: 'PROD-NET-10', server_role: ['SQL'] },
  { name: 'EXCH01', ip_address: '10.10.0.40', os: 'Windows Server 2019', environment: 'production', status: 'active', networkName: 'PROD-NET-10', server_role: ['Exchange'] },
  { name: 'BACKUP01', ip_address: '10.20.0.10', os: 'Windows Server 2022', environment: 'production', status: 'active', networkName: 'MGMT-NET-20', server_role: ['Backup'] },
  { name: 'MONITOR01', ip_address: '10.20.0.20', os: 'Ubuntu 22.04', environment: 'production', status: 'active', networkName: 'MGMT-NET-20', server_role: [] },
  // Dev servers
  { name: 'DEV-SQL01', ip_address: '10.30.0.10', os: 'Windows Server 2022', environment: 'development', status: 'active', networkName: 'DEV-NET-30', server_role: ['SQL'] },
  { name: 'DEV-WEB01', ip_address: '10.30.0.20', os: 'Ubuntu 22.04', environment: 'development', status: 'active', networkName: 'DEV-NET-30', server_role: ['IIS'] },
  { name: 'DEV-JENKINS', ip_address: '10.30.0.30', os: 'Ubuntu 22.04', environment: 'development', status: 'active', networkName: 'DEV-NET-30', server_role: [] },
  // DMZ servers
  { name: 'FW-MGMT01', ip_address: '10.40.0.10', os: 'Ubuntu 22.04', environment: 'production', status: 'active', networkName: 'DMZ-NET-40', server_role: [] },
  { name: 'VPN01', ip_address: '10.40.0.20', os: 'Ubuntu 22.04', environment: 'production', status: 'active', networkName: 'DMZ-NET-40', server_role: [] },
  { name: 'PROXY01', ip_address: '10.40.0.30', os: 'Ubuntu 22.04', environment: 'production', status: 'active', networkName: 'DMZ-NET-40', server_role: [] },
  // Some maintenance/inactive servers
  { name: 'OLD-DC01', ip_address: '10.10.0.100', os: 'Windows Server 2016', environment: 'production', status: 'maintenance', networkName: 'PROD-NET-10', server_role: ['DC'] },
  { name: 'LEGACY-APP', ip_address: '10.10.0.101', os: 'Windows Server 2012 R2', environment: 'production', status: 'inactive', networkName: 'PROD-NET-10', server_role: ['IIS'] },
];

const SEED_TASKS = [
  { title: 'Review firewall rules', description: 'Annual firewall rule audit', priority: 'high', status: 'open', domainCode: 'DMZ' },
  { title: 'Update DNS records', description: 'Add new application DNS entries', priority: 'medium', status: 'open', domainCode: 'CORP' },
  { title: 'Patch Windows servers', description: 'February 2026 security patches', priority: 'high', status: 'in_progress', domainCode: 'CORP' },
  { title: 'Backup verification', description: 'Weekly backup restore test', priority: 'medium', status: 'in_progress', domainCode: 'CORP' },
  { title: 'Deploy monitoring agents', description: 'Install Zabbix agents on new servers', priority: 'low', status: 'open', domainCode: 'DEV' },
  { title: 'SSL certificate renewal', description: 'Renew wildcard certificate for *.corp.local', priority: 'high', status: 'done', domainCode: 'CORP' },
  { title: 'Storage capacity review', description: 'Quarterly storage utilization report', priority: 'medium', status: 'done', domainCode: 'CORP' },
  { title: 'VM template update', description: 'Update Windows Server 2022 template', priority: 'low', status: 'done', domainCode: 'DEV' },
  { title: 'Network documentation', description: 'Update network topology diagrams', priority: 'low', status: 'open', domainCode: 'BRANCH' },
  { title: 'User access review', description: 'Quarterly access rights audit', priority: 'high', status: 'open', domainCode: 'CORP' },
  { title: 'Exchange mailbox cleanup', description: 'Archive old mailboxes', priority: 'medium', status: 'in_progress', domainCode: 'CORP' },
  { title: 'VPN configuration audit', description: 'Review VPN tunnel configurations', priority: 'medium', status: 'open', domainCode: 'DMZ' },
  { title: 'Database optimization', description: 'SQL Server index maintenance', priority: 'high', status: 'done', domainCode: 'CORP' },
  { title: 'Deploy new proxy server', description: 'Add redundant proxy for DMZ', priority: 'medium', status: 'open', domainCode: 'DMZ' },
  { title: 'Review security logs', description: 'Weekly SIEM alert review', priority: 'high', status: 'done', domainCode: 'DMZ' },
  { title: 'Update WSUS settings', description: 'Configure new update classifications', priority: 'low', status: 'open', domainCode: 'CORP' },
  { title: 'Test DR failover', description: 'Quarterly DR drill', priority: 'high', status: 'open', domainCode: 'CORP' },
  { title: 'Upgrade Jenkins', description: 'Update Jenkins to latest LTS', priority: 'low', status: 'in_progress', domainCode: 'DEV' },
  { title: 'Configure log forwarding', description: 'Send logs to SIEM', priority: 'medium', status: 'done', domainCode: 'DEV' },
  { title: 'Implement MFA', description: 'Enable MFA for admin accounts', priority: 'high', status: 'in_progress', domainCode: 'CORP' },
];

const SEED_MAINTENANCE_WINDOWS = [
  { title: 'Windows Patching - Feb 2026', description: 'Monthly security patches', status: 'planned', start_time: '2026-02-15T22:00:00Z', end_time: '2026-02-16T06:00:00Z', domainCode: 'CORP', impact_level: 'medium' },
  { title: 'Exchange CU Update', description: 'Cumulative update installation', status: 'planned', start_time: '2026-02-22T23:00:00Z', end_time: '2026-02-23T05:00:00Z', domainCode: 'CORP', impact_level: 'high' },
  { title: 'Network Switch Upgrade', description: 'Core switch firmware update', status: 'in_progress', start_time: '2026-02-06T01:00:00Z', end_time: '2026-02-06T04:00:00Z', domainCode: 'CORP', impact_level: 'high' },
  { title: 'Storage Array Maintenance', description: 'Nutanix cluster rebalance', status: 'planned', start_time: '2026-03-01T00:00:00Z', end_time: '2026-03-01T08:00:00Z', domainCode: 'CORP', impact_level: 'medium' },
  { title: 'VPN Gateway Update', description: 'OpenVPN server upgrade', status: 'completed', start_time: '2026-02-01T02:00:00Z', end_time: '2026-02-01T04:00:00Z', domainCode: 'DMZ', impact_level: 'high', completion_notes: 'Upgrade completed successfully. No issues reported.' },
  { title: 'Firewall Rule Cleanup', description: 'Remove deprecated rules', status: 'completed', start_time: '2026-01-28T23:00:00Z', end_time: '2026-01-29T01:00:00Z', domainCode: 'DMZ', impact_level: 'low', completion_notes: 'Removed 47 deprecated rules. Performance improved.' },
  { title: 'Dev Environment Refresh', description: 'Rebuild development VMs', status: 'completed', start_time: '2026-02-03T10:00:00Z', end_time: '2026-02-03T18:00:00Z', domainCode: 'DEV', impact_level: 'low', completion_notes: 'All dev VMs rebuilt with latest templates.' },
  { title: 'Branch Server Upgrade', description: 'Hardware refresh for branch', status: 'planned', start_time: '2026-02-20T22:00:00Z', end_time: '2026-02-21T06:00:00Z', domainCode: 'BRANCH', impact_level: 'medium' },
  { title: 'Certificate Renewal', description: 'Renew SSL certificates', status: 'in_progress', start_time: '2026-02-06T10:00:00Z', end_time: '2026-02-06T12:00:00Z', domainCode: 'CORP', impact_level: 'low' },
  { title: 'Backup System Update', description: 'Veeam version upgrade', status: 'planned', start_time: '2026-02-28T23:00:00Z', end_time: '2026-03-01T03:00:00Z', domainCode: 'CORP', impact_level: 'medium' },
];

const SEED_NOTIFICATIONS = [
  { title: 'High CPU on SQL01', message: 'CPU usage exceeded 90% for 15 minutes', severity: 'warning', type: 'alert', code: 'CPU_HIGH', entity_type: 'server' },
  { title: 'Backup Job Failed', message: 'Nightly backup job for FILE01 failed', severity: 'critical', type: 'alert', code: 'BACKUP_FAILED', entity_type: 'server' },
  { title: 'License Expiring', message: 'VMware vSphere license expires in 14 days', severity: 'warning', type: 'reminder', code: 'LICENSE_EXPIRING', entity_type: 'license' },
  { title: 'Maintenance Starting Soon', message: 'Windows Patching starts in 2 hours', severity: 'info', type: 'reminder', code: 'MAINT_UPCOMING', entity_type: 'maintenance' },
  { title: 'New Task Assigned', message: 'You have been assigned: Review firewall rules', severity: 'info', type: 'task', code: 'TASK_ASSIGNED', entity_type: 'task' },
];

async function seedProductionData(supabaseAdmin: any, ownerProfileId: string) {
  console.log('Starting production data seed...');
  
  // 1. Create Sites
  console.log('Creating sites...');
  const { data: sites, error: sitesError } = await supabaseAdmin
    .from('sites')
    .insert(SEED_SITES.map(s => ({ ...s, created_by: ownerProfileId })))
    .select();
  
  if (sitesError) throw new Error(`Failed to create sites: ${sitesError.message}`);
  
  const siteMap = new Map(sites.map((s: any) => [s.code, s]));
  
  // 2. Create site membership for owner
  console.log('Creating site membership for owner...');
  for (const site of sites) {
    await supabaseAdmin.from('site_memberships').insert({
      site_id: site.id,
      profile_id: ownerProfileId,
      site_role: 'site_admin',
    });
  }
  
  // 3. Create Domains
  console.log('Creating domains...');
  const { data: domains, error: domainsError } = await supabaseAdmin
    .from('domains')
    .insert(SEED_DOMAINS.map(d => ({
      name: d.name,
      description: d.description,
      code: d.code,
      site_id: siteMap.get(d.siteCode)?.id,
    })))
    .select();
  
  if (domainsError) throw new Error(`Failed to create domains: ${domainsError.message}`);
  
  const domainMap = new Map(domains.map((d: any) => [d.code, d]));
  
  // 4. Create domain membership for owner
  console.log('Creating domain membership for owner...');
  for (const domain of domains) {
    await supabaseAdmin.from('domain_memberships').insert({
      domain_id: domain.id,
      profile_id: ownerProfileId,
      domain_role: 'domain_admin',
      can_edit: true,
    });
  }
  
  // 5. Create Datacenters
  console.log('Creating datacenters...');
  const { data: datacenters, error: dcError } = await supabaseAdmin
    .from('datacenters')
    .insert(SEED_DATACENTERS.map(dc => ({
      name: dc.name,
      location: dc.location,
      site_id: siteMap.get(dc.siteCode)?.id,
      domain_id: domainMap.get(dc.domainCode)?.id,
      created_by: ownerProfileId,
    })))
    .select();
  
  if (dcError) throw new Error(`Failed to create datacenters: ${dcError.message}`);
  
  const dcMap = new Map(datacenters.map((dc: any) => [dc.name, dc]));
  
  // 6. Create Clusters
  console.log('Creating clusters...');
  const { data: clusters, error: clustersError } = await supabaseAdmin
    .from('clusters')
    .insert(SEED_CLUSTERS.map(c => {
      const dc = dcMap.get(c.datacenterName);
      return {
        name: c.name,
        datacenter_id: dc?.id,
        domain_id: dc?.domain_id,
        cluster_type: c.cluster_type,
        vendor: c.vendor,
        platform_version: c.platform_version,
        node_count: c.node_count,
        created_by: ownerProfileId,
      };
    }))
    .select();
  
  if (clustersError) throw new Error(`Failed to create clusters: ${clustersError.message}`);
  
  const clusterMap = new Map(clusters.map((c: any) => [c.name, c]));
  
  // 7. Create Networks
  console.log('Creating networks...');
  const { data: networks, error: networksError } = await supabaseAdmin
    .from('networks')
    .insert(SEED_NETWORKS.map(n => ({
      name: n.name,
      subnet: n.subnet,
      gateway: n.gateway,
      dns_servers: n.dns_servers,
      cluster_id: clusterMap.get(n.clusterName)?.id,
      domain_id: domainMap.get(n.domainCode)?.id,
    })))
    .select();
  
  if (networksError) throw new Error(`Failed to create networks: ${networksError.message}`);
  
  const networkMap = new Map(networks.map((n: any) => [n.name, n]));
  
  // 8. Create Servers
  console.log('Creating servers...');
  const { data: servers, error: serversError } = await supabaseAdmin
    .from('servers')
    .insert(SEED_SERVERS.map(s => {
      const network = networkMap.get(s.networkName);
      return {
        name: s.name,
        ip_address: s.ip_address,
        operating_system: s.os,
        environment: s.environment,
        status: s.status,
        network_id: network?.id,
        domain_id: network?.domain_id,
        server_role: s.server_role,
        created_by: ownerProfileId,
      };
    }))
    .select();
  
  if (serversError) throw new Error(`Failed to create servers: ${serversError.message}`);
  
  console.log(`Created ${servers.length} servers`);
  
  // 9. Create Tasks
  console.log('Creating tasks...');
  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from('tasks')
    .insert(SEED_TASKS.map(t => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      task_status: t.status === 'done' ? 'completed' : t.status === 'in_progress' ? 'in_progress' : 'open',
      created_by: ownerProfileId,
      due_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    })))
    .select();
  
  if (tasksError) throw new Error(`Failed to create tasks: ${tasksError.message}`);
  
  console.log(`Created ${tasks.length} tasks`);
  
  // 10. Create Maintenance Windows
  console.log('Creating maintenance windows...');
  const { data: maintenanceWindows, error: mwError } = await supabaseAdmin
    .from('maintenance_windows')
    .insert(SEED_MAINTENANCE_WINDOWS.map(m => ({
      title: m.title,
      description: m.description,
      status: m.status,
      start_time: m.start_time,
      end_time: m.end_time,
      site_id: siteMap.get('RUH')?.id,
      domain_id: domainMap.get(m.domainCode)?.id,
      impact_level: m.impact_level,
      completion_notes: m.completion_notes || null,
      created_by: ownerProfileId,
    })))
    .select();
  
  if (mwError) throw new Error(`Failed to create maintenance windows: ${mwError.message}`);
  
  console.log(`Created ${maintenanceWindows.length} maintenance windows`);
  
  // 11. Create Notifications
  console.log('Creating notifications...');
  const siteRUH = siteMap.get('RUH');
  const { data: notifications, error: notifError } = await supabaseAdmin
    .from('notifications')
    .insert(SEED_NOTIFICATIONS.map(n => ({
      title: n.title,
      message: n.message,
      severity: n.severity,
      type: n.type,
      code: n.code,
      entity_type: n.entity_type,
      site_id: siteRUH?.id,
      is_read: false,
    })))
    .select();
  
  if (notifError) throw new Error(`Failed to create notifications: ${notifError.message}`);
  
  console.log(`Created ${notifications.length} notifications`);
  
  return {
    sites: sites.length,
    domains: domains.length,
    datacenters: datacenters.length,
    clusters: clusters.length,
    networks: networks.length,
    servers: servers.length,
    tasks: tasks.length,
    maintenanceWindows: maintenanceWindows.length,
    notifications: notifications.length,
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
    
    // Parse request body
    const body = await req.json();
    const { confirm_token, type } = body;
    
    // Validate double confirmation
    if (type !== 'RESET_PROD' || confirm_token !== 'CONFIRM_RESET_ALL_DATA') {
      return new Response(
        JSON.stringify({ 
          error: 'Double confirmation required',
          required: { type: 'RESET_PROD', confirm_token: 'CONFIRM_RESET_ALL_DATA' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get caller's user ID from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify the user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // STRICT GATE: Only allow the hardcoded owner email
    if (user.email !== ALLOWED_OWNER_EMAIL) {
      console.log(`Unauthorized reset attempt by: ${user.email}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only system owner can perform reset' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify user has SuperAdmin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();
    
    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: SuperAdmin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the owner's profile
    const { data: ownerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (!ownerProfile) {
      return new Response(
        JSON.stringify({ error: 'Owner profile not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Starting reset initiated by: ${user.email} (${user.id})`);
    
    // STEP 1: Truncate all app tables (in order to respect FK dependencies)
    console.log('Truncating app tables...');
    const truncateErrors: string[] = [];
    
    for (const table of TABLES_TO_TRUNCATE) {
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', {
          sql: `TRUNCATE TABLE public.${table} CASCADE`
        });
        if (error) {
          // Try delete as fallback
          const { error: deleteError } = await supabaseAdmin
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Match all
          if (deleteError) {
            truncateErrors.push(`${table}: ${deleteError.message}`);
          }
        }
        console.log(`Cleared: ${table}`);
      } catch (e) {
        // Try delete as fallback
        try {
          await supabaseAdmin.from(table).delete().gte('created_at', '1970-01-01');
          console.log(`Deleted from: ${table}`);
        } catch (e2) {
          truncateErrors.push(`${table}: ${e}`);
        }
      }
    }
    
    // STEP 2: Clean up profiles except owner
    console.log('Cleaning up profiles except owner...');
    const { error: profilesError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .neq('id', ownerProfile.id);
    
    if (profilesError) {
      console.error('Error cleaning profiles:', profilesError);
    }
    
    // STEP 3: Clean up user_roles except owner
    console.log('Cleaning up user_roles except owner...');
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .neq('user_id', user.id);
    
    if (rolesError) {
      console.error('Error cleaning user_roles:', rolesError);
    }
    
    // STEP 4: Ensure owner has SuperAdmin role assignment
    console.log('Ensuring owner role assignment...');
    const { data: superAdminRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'SuperAdmin')
      .maybeSingle();
    
    if (superAdminRole) {
      // Clear any existing role assignments for owner
      await supabaseAdmin
        .from('role_assignments')
        .delete()
        .eq('user_id', user.id);
      
      // Create fresh SuperAdmin assignment
      await supabaseAdmin
        .from('role_assignments')
        .insert({
          user_id: user.id,
          role_id: superAdminRole.id,
          scope_type: 'site',
          scope_id: null, // Global
          status: 'active',
          granted_by: user.id,
        });
    }
    
    // STEP 5: Seed production-like data
    console.log('Seeding production data...');
    const seedCounts = await seedProductionData(supabaseAdmin, ownerProfile.id);
    
    console.log('Reset and seed completed successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reset and seed completed',
        preserved: {
          user_email: user.email,
          profile_id: ownerProfile.id,
        },
        seeded: seedCounts,
        warnings: truncateErrors.length > 0 ? truncateErrors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Reset error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Reset failed', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
