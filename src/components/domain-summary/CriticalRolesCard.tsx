import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield,
  Server as ServerIcon,
  HardDrive,
  Mail,
  Globe,
  Database,
  Lock,
  Network,
  Printer,
  FileText,
  Monitor,
  Download,
  Settings,
  FolderKanban,
  Layers,
  Key,
  Wifi,
} from 'lucide-react';

interface CriticalRolesCardProps {
  servers: any[];
}

// Define critical server roles with their icons and labels
const CRITICAL_ROLES = [
  { key: 'DC', label: 'domainSummary.roleDC', icon: Shield, color: 'text-blue-500' },
  { key: 'CA', label: 'domainSummary.roleCA', icon: Lock, color: 'text-purple-500' },
  { key: 'DNS', label: 'domainSummary.roleDNS', icon: Globe, color: 'text-green-500' },
  { key: 'DHCP', label: 'domainSummary.roleDHCP', icon: Network, color: 'text-orange-500' },
  { key: 'File', label: 'domainSummary.roleFile', icon: HardDrive, color: 'text-yellow-500' },
  { key: 'Exchange', label: 'domainSummary.roleExchange', icon: Mail, color: 'text-cyan-500' },
  { key: 'SQL', label: 'domainSummary.roleSQL', icon: Database, color: 'text-red-500' },
  { key: 'IIS', label: 'domainSummary.roleIIS', icon: Globe, color: 'text-indigo-500' },
  { key: 'Print', label: 'domainSummary.rolePrint', icon: Printer, color: 'text-pink-500' },
  { key: 'Backup', label: 'domainSummary.roleBackup', icon: FileText, color: 'text-teal-500' },
  { key: 'Hyper-V', label: 'domainSummary.roleHyperV', icon: Monitor, color: 'text-violet-500' },
  { key: 'RDS', label: 'domainSummary.roleRDS', icon: Monitor, color: 'text-emerald-500' },
  // New professional roles
  { key: 'WSUS', label: 'domainSummary.roleWSUS', icon: Download, color: 'text-sky-500' },
  { key: 'SCCM', label: 'domainSummary.roleSCCM', icon: Settings, color: 'text-slate-500' },
  { key: 'NPS', label: 'domainSummary.roleNPS', icon: Wifi, color: 'text-amber-500' },
  { key: 'WDS', label: 'domainSummary.roleWDS', icon: HardDrive, color: 'text-lime-500' },
  { key: 'ADFS', label: 'domainSummary.roleADFS', icon: Key, color: 'text-rose-500' },
  { key: 'NLB', label: 'domainSummary.roleNLB', icon: Network, color: 'text-fuchsia-500' },
  { key: 'DFS', label: 'domainSummary.roleDFS', icon: FolderKanban, color: 'text-orange-400' },
  { key: 'Cluster', label: 'domainSummary.roleCluster', icon: Layers, color: 'text-blue-400' },
];

const CriticalRolesCard: React.FC<CriticalRolesCardProps> = ({ servers }) => {
  const { t, dir } = useLanguage();

  // Group servers by their roles based on primary_application or notes
  const serversByRole = useMemo(() => {
    const roleMap: Record<string, any[]> = {};

    servers.forEach(server => {
      const serverInfo = `${server.primary_application || ''} ${server.notes || ''} ${server.name || ''}`.toLowerCase();
      
      CRITICAL_ROLES.forEach(role => {
        const roleKey = role.key.toLowerCase();
        // Check if server matches this role
        if (
          serverInfo.includes(roleKey) ||
          serverInfo.includes(role.key) ||
          (roleKey === 'dc' && (serverInfo.includes('domain controller') || serverInfo.includes('active directory'))) ||
          (roleKey === 'ca' && serverInfo.includes('certificate')) ||
          (roleKey === 'file' && (serverInfo.includes('file server') || serverInfo.includes('dfs'))) ||
          (roleKey === 'exchange' && serverInfo.includes('mail')) ||
          (roleKey === 'sql' && (serverInfo.includes('database') || serverInfo.includes('mssql'))) ||
          (roleKey === 'backup' && serverInfo.includes('veeam')) ||
          (roleKey === 'wsus' && (serverInfo.includes('update services') || serverInfo.includes('wsus'))) ||
          (roleKey === 'sccm' && (serverInfo.includes('sccm') || serverInfo.includes('endpoint manager') || serverInfo.includes('system center'))) ||
          (roleKey === 'nps' && (serverInfo.includes('radius') || serverInfo.includes('network policy'))) ||
          (roleKey === 'wds' && (serverInfo.includes('deployment') || serverInfo.includes('wds'))) ||
          (roleKey === 'adfs' && (serverInfo.includes('federation') || serverInfo.includes('adfs'))) ||
          (roleKey === 'nlb' && (serverInfo.includes('load balancing') || serverInfo.includes('nlb'))) ||
          (roleKey === 'dfs' && (serverInfo.includes('distributed file') || serverInfo.includes('dfs'))) ||
          (roleKey === 'cluster' && (serverInfo.includes('failover cluster') || serverInfo.includes('cluster')))
        ) {
          if (!roleMap[role.key]) {
            roleMap[role.key] = [];
          }
          // Avoid duplicates
          if (!roleMap[role.key].find(s => s.id === server.id)) {
            roleMap[role.key].push(server);
          }
        }
      });
    });

    return roleMap;
  }, [servers]);

  const activeRoles = CRITICAL_ROLES.filter(role => serversByRole[role.key]?.length > 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <ServerIcon className="w-5 h-5 text-primary" />
          {t('domainSummary.criticalRoles')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeRoles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ServerIcon className="w-12 h-12 mb-2 opacity-50" />
            <p>{t('domainSummary.noRolesDetected')}</p>
            <p className="text-sm mt-1">{t('domainSummary.rolesHint')}</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-3">
              {activeRoles.map(role => {
                const Icon = role.icon;
                const roleServers = serversByRole[role.key] || [];
                
                return (
                  <div
                    key={role.key}
                    className="p-3 rounded-lg bg-secondary/50 border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md bg-background ${role.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{t(role.label)}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {roleServers.length} {t('domainSummary.server')}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {roleServers.slice(0, 4).map(server => (
                        <Badge
                          key={server.id}
                          variant="outline"
                          className={`text-xs ${
                            server.status === 'active' 
                              ? 'border-success/50 text-success' 
                              : 'border-warning/50 text-warning'
                          }`}
                        >
                          {server.name}
                        </Badge>
                      ))}
                      {roleServers.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{roleServers.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default CriticalRolesCard;
