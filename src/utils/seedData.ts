import { supabase } from '@/integrations/supabase/client';

// Sample domains data
const sampleDomains = [
  { name: 'example.local', description: 'Main corporate domain' },
  { name: 'dev.example.local', description: 'Development domain' },
  { name: 'test.example.local', description: 'Testing domain' },
];

// Sample networks data
const sampleNetworks = [
  { name: 'Production Network', subnet: '192.168.1.0/24', gateway: '192.168.1.1', dns_servers: ['8.8.8.8', '8.8.4.4'] },
  { name: 'Development Network', subnet: '192.168.2.0/24', gateway: '192.168.2.1', dns_servers: ['8.8.8.8'] },
  { name: 'DMZ Network', subnet: '10.0.0.0/24', gateway: '10.0.0.1', dns_servers: ['1.1.1.1'] },
];

// Sample servers data
const sampleServers = [
  { name: 'DC01', ip_address: '192.168.1.10', operating_system: 'Windows Server 2022', environment: 'production', status: 'active', owner: 'IT Department', responsible_user: 'Admin', primary_application: 'Active Directory', is_backed_up_by_veeam: true, backup_frequency: 'daily' },
  { name: 'WEB01', ip_address: '192.168.1.20', operating_system: 'Ubuntu 22.04 LTS', environment: 'production', status: 'active', owner: 'DevOps', responsible_user: 'WebAdmin', primary_application: 'Nginx', is_backed_up_by_veeam: true, backup_frequency: 'daily' },
  { name: 'DB01', ip_address: '192.168.1.30', operating_system: 'Windows Server 2022', environment: 'production', status: 'active', owner: 'DBA Team', responsible_user: 'DBAdmin', primary_application: 'SQL Server 2022', is_backed_up_by_veeam: true, backup_frequency: 'daily' },
  { name: 'APP01', ip_address: '192.168.1.40', operating_system: 'Windows Server 2019', environment: 'production', status: 'active', owner: 'Development', responsible_user: 'AppAdmin', primary_application: 'IIS', is_backed_up_by_veeam: true, backup_frequency: 'weekly' },
  { name: 'DEV01', ip_address: '192.168.2.10', operating_system: 'Ubuntu 22.04 LTS', environment: 'development', status: 'active', owner: 'Development', responsible_user: 'Developer', primary_application: 'Docker', is_backed_up_by_veeam: false },
  { name: 'TEST01', ip_address: '192.168.2.20', operating_system: 'Windows Server 2019', environment: 'testing', status: 'active', owner: 'QA Team', responsible_user: 'QA Lead', primary_application: 'Test Suite', is_backed_up_by_veeam: false },
  { name: 'MAIL01', ip_address: '192.168.1.50', operating_system: 'Windows Server 2022', environment: 'production', status: 'active', owner: 'IT Department', responsible_user: 'MailAdmin', primary_application: 'Exchange 2019', is_backed_up_by_veeam: true, backup_frequency: 'daily' },
  { name: 'FILE01', ip_address: '192.168.1.60', operating_system: 'Windows Server 2022', environment: 'production', status: 'active', owner: 'IT Department', responsible_user: 'FileAdmin', primary_application: 'File Server', is_backed_up_by_veeam: true, backup_frequency: 'daily' },
];

// Sample licenses data
const sampleLicenses = [
  { name: 'Microsoft 365 E3', vendor: 'Microsoft', license_key: 'XXXXX-XXXXX-XXXXX-XXXXX', quantity: 100, expiry_date: '2026-12-31', cost: 35000, status: 'active' },
  { name: 'VMware vSphere Enterprise', vendor: 'VMware', license_key: 'VMWARE-XXXXX-XXXXX', quantity: 10, expiry_date: '2026-06-30', cost: 15000, status: 'active' },
  { name: 'Veeam Backup & Replication', vendor: 'Veeam', license_key: 'VEEAM-XXXXX-XXXXX', quantity: 20, expiry_date: '2026-03-15', cost: 8000, status: 'active' },
  { name: 'Windows Server 2022 Datacenter', vendor: 'Microsoft', license_key: 'WINSVR-XXXXX-XXXXX', quantity: 5, expiry_date: '2027-01-01', cost: 12000, status: 'active' },
  { name: 'SQL Server 2022 Enterprise', vendor: 'Microsoft', license_key: 'SQLSVR-XXXXX-XXXXX', quantity: 2, expiry_date: '2026-09-30', cost: 25000, status: 'active' },
  { name: 'Adobe Creative Cloud', vendor: 'Adobe', license_key: 'ADOBE-XXXXX-XXXXX', quantity: 10, expiry_date: '2026-02-28', cost: 6000, status: 'active' },
  { name: 'Kaspersky Endpoint Security', vendor: 'Kaspersky', license_key: 'KASP-XXXXX-XXXXX', quantity: 200, expiry_date: '2026-04-15', cost: 4500, status: 'active' },
];

// Sample tasks data
const sampleTasks = [
  { title: 'Weekly Backup Verification', description: 'Verify all server backups are completing successfully', priority: 'p2', frequency: 'weekly', status: 'pending', task_status: 'todo' },
  { title: 'Monthly Security Patches', description: 'Apply monthly security patches to all production servers', priority: 'p1', frequency: 'monthly', status: 'pending', task_status: 'todo' },
  { title: 'SSL Certificate Renewal', description: 'Renew SSL certificates for web applications', priority: 'p1', frequency: 'once', status: 'pending', task_status: 'in_progress' },
  { title: 'Firewall Rules Review', description: 'Review and update firewall rules for security compliance', priority: 'p2', frequency: 'monthly', status: 'pending', task_status: 'todo' },
  { title: 'Database Optimization', description: 'Optimize database indexes and clean up old records', priority: 'p3', frequency: 'weekly', status: 'pending', task_status: 'todo' },
  { title: 'User Access Audit', description: 'Review user access permissions across all systems', priority: 'p2', frequency: 'monthly', status: 'pending', task_status: 'review' },
  { title: 'Disk Space Monitoring', description: 'Monitor disk space on all servers and clean up if needed', priority: 'p3', frequency: 'daily', status: 'pending', task_status: 'todo' },
  { title: 'Network Performance Check', description: 'Check network performance and latency across all sites', priority: 'p3', frequency: 'weekly', status: 'pending', task_status: 'done' },
];

// Sample web applications data
const sampleWebApps = [
  { name: 'GitLab', url: 'https://gitlab.example.local', category: 'development', icon: '🦊', description: 'Git repository management', is_active: true },
  { name: 'Grafana', url: 'https://grafana.example.local', category: 'monitoring', icon: '📊', description: 'Metrics and monitoring dashboard', is_active: true },
  { name: 'Zabbix', url: 'https://zabbix.example.local', category: 'monitoring', icon: '🔍', description: 'Infrastructure monitoring', is_active: true },
  { name: 'Jenkins', url: 'https://jenkins.example.local', category: 'development', icon: '🔧', description: 'CI/CD automation server', is_active: true },
  { name: 'Confluence', url: 'https://confluence.example.local', category: 'communication', icon: '📝', description: 'Documentation wiki', is_active: true },
  { name: 'Jira', url: 'https://jira.example.local', category: 'development', icon: '🎫', description: 'Issue tracking', is_active: true },
  { name: 'Portainer', url: 'https://portainer.example.local', category: 'infrastructure', icon: '🐳', description: 'Docker management', is_active: true },
  { name: 'pfSense', url: 'https://pfsense.example.local', category: 'security', icon: '🔒', description: 'Firewall management', is_active: true },
];

// Sample vault items data
const sampleVaultItems = [
  { title: 'DC01 Administrator', username: 'administrator', item_type: 'server', url: 'DC01', notes: 'Primary domain controller admin account' },
  { title: 'GitLab Root', username: 'root', item_type: 'website', url: 'https://gitlab.example.local', notes: 'GitLab root admin account' },
  { title: 'SQL Server SA', username: 'sa', item_type: 'server', url: 'DB01', notes: 'SQL Server system administrator' },
  { title: 'VMware vCenter', username: 'administrator@vsphere.local', item_type: 'application', url: 'https://vcenter.example.local', notes: 'vCenter admin account' },
  { title: 'Firewall Admin', username: 'admin', item_type: 'network_device', url: '192.168.1.1', notes: 'Main firewall admin account' },
  { title: 'Cloud API Key', username: 'api_key', item_type: 'api_key', notes: 'Production cloud API key' },
];

export interface SeedResult {
  success: boolean;
  message: string;
  details?: {
    domains: number;
    networks: number;
    servers: number;
    licenses: number;
    tasks: number;
    webApps: number;
    vaultItems: number;
  };
}

export async function seedAllData(): Promise<SeedResult> {
  try {
    // Get current user's profile for created_by fields
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    let createdCounts = {
      domains: 0,
      networks: 0,
      servers: 0,
      licenses: 0,
      tasks: 0,
      webApps: 0,
      vaultItems: 0,
    };

    // 1. Create Domains
    const { data: existingDomains } = await supabase.from('domains').select('name');
    const existingDomainNames = existingDomains?.map(d => d.name) || [];
    const newDomains = sampleDomains.filter(d => !existingDomainNames.includes(d.name));
    
    if (newDomains.length > 0) {
      const { data: createdDomains, error: domainError } = await supabase
        .from('domains')
        .insert(newDomains)
        .select();
      
      if (domainError) throw new Error(`Failed to create domains: ${domainError.message}`);
      createdCounts.domains = createdDomains?.length || 0;
    }

    // Get all domains for network creation
    const { data: allDomains } = await supabase.from('domains').select('*');
    const domainMap = new Map(allDomains?.map(d => [d.name, d.id]) || []);

    // 2. Create Networks
    const { data: existingNetworks } = await supabase.from('networks').select('name');
    const existingNetworkNames = existingNetworks?.map(n => n.name) || [];
    const newNetworks = sampleNetworks
      .filter(n => !existingNetworkNames.includes(n.name))
      .map((network, index) => ({
        ...network,
        domain_id: allDomains?.[index % (allDomains?.length || 1)]?.id,
      }));

    if (newNetworks.length > 0) {
      const { data: createdNetworks, error: networkError } = await supabase
        .from('networks')
        .insert(newNetworks)
        .select();
      
      if (networkError) throw new Error(`Failed to create networks: ${networkError.message}`);
      createdCounts.networks = createdNetworks?.length || 0;
    }

    // Get all networks for server creation
    const { data: allNetworks } = await supabase.from('networks').select('*');

    // 3. Create Servers
    const { data: existingServers } = await supabase.from('servers').select('name');
    const existingServerNames = existingServers?.map(s => s.name) || [];
    const newServers = sampleServers
      .filter(s => !existingServerNames.includes(s.name))
      .map((server, index) => ({
        ...server,
        network_id: allNetworks?.[index % (allNetworks?.length || 1)]?.id,
        created_by: profile.id,
      }));

    if (newServers.length > 0) {
      const { data: createdServers, error: serverError } = await supabase
        .from('servers')
        .insert(newServers)
        .select();
      
      if (serverError) throw new Error(`Failed to create servers: ${serverError.message}`);
      createdCounts.servers = createdServers?.length || 0;
    }

    // 4. Create Licenses
    const { data: existingLicenses } = await supabase.from('licenses').select('name');
    const existingLicenseNames = existingLicenses?.map(l => l.name) || [];
    const newLicenses = sampleLicenses
      .filter(l => !existingLicenseNames.includes(l.name))
      .map((license, index) => ({
        ...license,
        domain_id: allDomains?.[index % (allDomains?.length || 1)]?.id,
        created_by: profile.id,
        purchase_date: new Date().toISOString().split('T')[0],
      }));

    if (newLicenses.length > 0) {
      const { data: createdLicenses, error: licenseError } = await supabase
        .from('licenses')
        .insert(newLicenses)
        .select();
      
      if (licenseError) throw new Error(`Failed to create licenses: ${licenseError.message}`);
      createdCounts.licenses = createdLicenses?.length || 0;
    }

    // 5. Create Tasks
    const { data: existingTasks } = await supabase.from('tasks').select('title');
    const existingTaskTitles = existingTasks?.map(t => t.title) || [];
    const now = new Date();
    const newTasks = sampleTasks
      .filter(t => !existingTaskTitles.includes(t.title))
      .map((task, index) => ({
        ...task,
        assigned_to: profile.id,
        created_by: profile.id,
        due_date: new Date(now.getTime() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
      }));

    if (newTasks.length > 0) {
      const { data: createdTasks, error: taskError } = await supabase
        .from('tasks')
        .insert(newTasks)
        .select();
      
      if (taskError) throw new Error(`Failed to create tasks: ${taskError.message}`);
      createdCounts.tasks = createdTasks?.length || 0;
    }

    // 6. Create Web Applications
    const { data: existingApps } = await supabase.from('website_applications').select('name');
    const existingAppNames = existingApps?.map(a => a.name) || [];
    const newWebApps = sampleWebApps
      .filter(a => !existingAppNames.includes(a.name))
      .map((app, index) => ({
        ...app,
        domain_id: allDomains?.[index % (allDomains?.length || 1)]?.id,
        created_by: profile.id,
      }));

    if (newWebApps.length > 0) {
      const { data: createdApps, error: appError } = await supabase
        .from('website_applications')
        .insert(newWebApps)
        .select();
      
      if (appError) throw new Error(`Failed to create web apps: ${appError.message}`);
      createdCounts.webApps = createdApps?.length || 0;
    }

    // 7. Create Vault Items (without password - just metadata)
    const { data: existingVaultItems } = await supabase.from('vault_items').select('title');
    const existingVaultTitles = existingVaultItems?.map(v => v.title) || [];
    
    // Get servers and apps for linking
    const { data: allServers } = await supabase.from('servers').select('id, name');
    const { data: allApps } = await supabase.from('website_applications').select('id, name');
    
    const newVaultItems = sampleVaultItems
      .filter(v => !existingVaultTitles.includes(v.title))
      .map((item) => {
        const baseItem = {
          title: item.title,
          username: item.username,
          item_type: item.item_type,
          url: item.url,
          notes: item.notes,
          owner_id: profile.id,
          created_by: profile.id,
        };

        // Link to server if type is server
        if (item.item_type === 'server') {
          const matchingServer = allServers?.find(s => item.url?.includes(s.name));
          if (matchingServer) {
            return { ...baseItem, linked_server_id: matchingServer.id };
          }
        }

        // Link to app if type is website
        if (item.item_type === 'website' || item.item_type === 'application') {
          const matchingApp = allApps?.find(a => item.url?.includes(a.name.toLowerCase()));
          if (matchingApp) {
            return { ...baseItem, linked_application_id: matchingApp.id };
          }
        }

        return baseItem;
      });

    if (newVaultItems.length > 0) {
      const { data: createdVaultItems, error: vaultError } = await supabase
        .from('vault_items')
        .insert(newVaultItems as any)
        .select();
      
      if (vaultError) throw new Error(`Failed to create vault items: ${vaultError.message}`);
      createdCounts.vaultItems = createdVaultItems?.length || 0;
    }

    const totalCreated = Object.values(createdCounts).reduce((a, b) => a + b, 0);
    
    return {
      success: true,
      message: totalCreated > 0 
        ? `Successfully created ${totalCreated} test records`
        : 'No new records created (data already exists)',
      details: createdCounts,
    };

  } catch (error) {
    console.error('Seed data error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
