import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppName, useAppSettings } from '@/hooks/useSupabaseData';
import { useTheme } from 'next-themes';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSION_KEYS, type PermissionKey } from '@/security/permissionKeys';
import { LayoutDashboard, Server, Users, KeyRound, ListTodo, Network, FileBarChart, Settings, Globe, ChevronLeft, ChevronRight, Calendar, FileSpreadsheet, Wifi, LogOut, User, Shield, History, Sun, Moon, Lock, Wrench, Building2, Phone, Clock, FolderKanban, Bot, ShoppingCart, FolderTree, Radio, UserCog, CheckSquare, Bell, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import NotificationBell from './NotificationBell';
import HierarchyTree from '@/components/hierarchy/HierarchyTree';
import GlobalSearch from '@/components/hierarchy/GlobalSearch';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  id: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  permissionKey?: PermissionKey;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

// Define menu items grouped by module
const menuGroups: MenuGroup[] = [
  {
    label: 'nav.dashboards',
    items: [
      { id: 'dashboard', path: '/', icon: LayoutDashboard, label: 'nav.dashboard', permissionKey: PERMISSION_KEYS.SITE_VIEW },
      { id: 'domainSummary', path: '/domain-summary', icon: Building2, label: 'nav.domainSummary', permissionKey: PERMISSION_KEYS.DOMAIN_VIEW },
      { id: 'noc', path: '/noc', icon: Radio, label: 'nav.noc' },
    ],
  },
  {
    label: 'nav.inventory',
    items: [
      { id: 'resources', path: '/resources', icon: Server, label: 'nav.resources', permissionKey: PERMISSION_KEYS.INVENTORY_RESOURCES_VIEW },
      { id: 'datacenter', path: '/datacenter', icon: Building2, label: 'nav.datacenter', permissionKey: PERMISSION_KEYS.INVENTORY_DATACENTERS_VIEW },
      { id: 'networks', path: '/networks', icon: Network, label: 'nav.networks', permissionKey: PERMISSION_KEYS.INVENTORY_NETWORKS_VIEW },
      { id: 'webApps', path: '/web-apps', icon: Globe, label: 'nav.webApps', permissionKey: PERMISSION_KEYS.WEBAPPS_VIEW },
    ],
  },
  {
    label: 'nav.identity',
    items: [
      { id: 'adOverview', path: '/ad-overview', icon: Shield, label: 'nav.adOverview', permissionKey: PERMISSION_KEYS.IDENTITY_AD_VIEW },
      { id: 'licenses', path: '/licenses', icon: KeyRound, label: 'nav.licenses', permissionKey: PERMISSION_KEYS.ASSETS_LICENSES_VIEW },
    ],
  },
  {
    label: 'nav.operations',
    items: [
      { id: 'employees', path: '/employees', icon: Users, label: 'nav.employees', permissionKey: PERMISSION_KEYS.PERSONNEL_EMPLOYEES_VIEW },
      { id: 'employeePermissions', path: '/employee-permissions', icon: Shield, label: 'nav.employeePermissions', permissionKey: PERMISSION_KEYS.ADMIN_RBAC_VIEW },
      { id: 'tasks', path: '/tasks', icon: ListTodo, label: 'nav.tasks', permissionKey: PERMISSION_KEYS.OPS_TASKS_VIEW },
      { id: 'maintenance', path: '/maintenance', icon: Wrench, label: 'nav.maintenance', permissionKey: PERMISSION_KEYS.OPS_MAINTENANCE_VIEW },
      { id: 'onCall', path: '/on-call', icon: Phone, label: 'nav.onCall', permissionKey: PERMISSION_KEYS.OPS_ONCALL_VIEW },
      { id: 'vacations', path: '/vacations', icon: Calendar, label: 'nav.vacations', permissionKey: PERMISSION_KEYS.PERSONNEL_VACATIONS_VIEW },
      { id: 'lifecycle', path: '/lifecycle', icon: Clock, label: 'nav.lifecycle' },
    ],
  },
  {
    label: 'nav.governance',
    items: [
      { id: 'notifications', path: '/governance/notifications', icon: Bell, label: 'nav.notifications', permissionKey: PERMISSION_KEYS.GOV_NOTIFICATIONS_VIEW },
      { id: 'approvals', path: '/governance/approvals', icon: CheckSquare, label: 'nav.approvals', permissionKey: PERMISSION_KEYS.GOV_APPROVALS_VIEW },
      { id: 'auditLog', path: '/audit-log', icon: History, label: 'nav.auditLog', permissionKey: PERMISSION_KEYS.GOV_AUDIT_VIEW },
      { id: 'reports', path: '/reports', icon: FileBarChart, label: 'nav.reports', permissionKey: PERMISSION_KEYS.GOV_REPORTS_VIEW },
    ],
  },
  {
    label: 'nav.integrations',
    items: [
      { id: 'virtualization', path: '/integrations/virtualization', icon: Cloud, label: 'nav.virtualization', permissionKey: PERMISSION_KEYS.INTEGRATIONS_VIRTUALIZATION_VIEW },
      { id: 'scanAgents', path: '/scan-agents', icon: Bot, label: 'nav.scanAgents', permissionKey: PERMISSION_KEYS.INTEGRATIONS_AGENTS_VIEW },
      { id: 'fileShares', path: '/file-shares', icon: FolderKanban, label: 'nav.fileShares' },
      { id: 'networkScan', path: '/network-scan', icon: Wifi, label: 'nav.networkScan' },
    ],
  },
  {
    label: 'nav.administration',
    items: [
      { id: 'rbacAdmin', path: '/admin/rbac', icon: UserCog, label: 'nav.rbac', permissionKey: PERMISSION_KEYS.ADMIN_RBAC_VIEW },
      { id: 'settings', path: '/settings', icon: Settings, label: 'nav.settings', permissionKey: PERMISSION_KEYS.ADMIN_SETTINGS_VIEW },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { t, language, setLanguage, dir } = useLanguage();
  const { profile, signOut } = useAuth();
  const { appName } = useAppName();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const { hasPermission } = usePermissions();

  const CollapseIcon = dir === 'rtl' 
    ? collapsed ? ChevronLeft : ChevronRight 
    : collapsed ? ChevronRight : ChevronLeft;

  const handleSignOut = async () => {
    await signOut();
  };

  // Filter menu items based on permissions
  const getVisibleGroups = () => {
    return menuGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => {
          if (!item.permissionKey) return true;
          return hasPermission(item.permissionKey);
        }),
      }))
      .filter(group => group.items.length > 0);
  };

  const visibleGroups = getVisibleGroups();

  const renderMenuItem = (item: MenuItem) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    
    const linkContent = (
      <Link 
        to={item.path} 
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          dir === 'rtl' ? 'flex-row-reverse text-right' : 'text-left',
          isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' : 'text-sidebar-foreground',
          collapsed && 'justify-center'
        )}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span className="truncate">{t(item.label)}</span>}
      </Link>
    );

    return (
      <li key={item.path}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {linkContent}
            </TooltipTrigger>
            <TooltipContent side={dir === 'rtl' ? 'left' : 'right'}>
              {t(item.label)}
            </TooltipContent>
          </Tooltip>
        ) : linkContent}
      </li>
    );
  };

  return (
    <aside className={cn(
      'fixed top-0 h-screen sidebar-gradient border-sidebar-border z-50 transition-all duration-300 flex flex-col',
      dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo & Offline Mode */}
      <div className={cn('flex items-center h-16 px-4 border-b border-sidebar-border', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="w-8 h-8 rounded-lg stat-primary flex items-center justify-center">
          <Server className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col flex-1">
            <span className="font-bold text-lg text-sidebar-foreground whitespace-nowrap">
              <span className="text-accent">IT</span>{' '}
              <span className="text-primary">Infrastructure</span>
            </span>
            <Badge variant="outline" className="text-[10px] w-fit px-1.5 py-0 border-accent text-accent">
              <Wifi className="w-2.5 h-2.5 me-1" />
              {t('common.offlineMode')}
            </Badge>
          </div>
        )}
      </div>

      {/* User Info */}
      {profile && !collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile.full_name}
              </p>
            </div>
            <NotificationBell />
          </div>
        </div>
      )}

      {/* Global Search */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-sidebar-border">
          <GlobalSearch collapsed={collapsed} />
        </div>
      )}
      {collapsed && (
        <div className="px-2 py-2 border-b border-sidebar-border flex justify-center">
          <GlobalSearch collapsed={collapsed} />
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="py-4 px-2">
          {visibleGroups.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex > 0 ? 'mt-6' : ''}>
              {!collapsed && (
                <div className="px-3 py-2">
                  <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                    {t(group.label)}
                  </h3>
                </div>
              )}
              <ul className="space-y-1">
                {group.items.map(item => renderMenuItem(item))}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size={collapsed ? 'icon' : 'default'} 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
          className={cn('w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', collapsed ? 'justify-center' : 'justify-start gap-2')}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {!collapsed && (theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode'))}
        </Button>

        {/* Language Toggle */}
        <Button 
          variant="ghost" 
          size={collapsed ? 'icon' : 'default'} 
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} 
          className={cn('w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', collapsed ? 'justify-center' : 'justify-start gap-2')}
        >
          <Globe className="w-4 h-4" />
          {!collapsed && (language === 'ar' ? 'English' : 'العربية')}
        </Button>

        <Separator className="bg-sidebar-border" />

        {/* Sign Out */}
        <Button 
          variant="ghost" 
          size={collapsed ? 'icon' : 'default'} 
          onClick={handleSignOut} 
          className={cn('w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive', collapsed ? 'justify-center' : 'justify-start gap-2')}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && t('common.signOut')}
        </Button>

        {/* Collapse Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggle} 
          className="w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <CollapseIcon className="w-4 h-4" />
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
