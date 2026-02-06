import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppName, useAppSettings } from '@/hooks/useSupabaseData';
import { useTheme } from 'next-themes';
import { usePermissions } from '@/hooks/usePermissions';
import { LayoutDashboard, Server, Users, KeyRound, ListTodo, Network, FileBarChart, Settings, Globe, ChevronLeft, ChevronRight, Calendar, FileSpreadsheet, Wifi, LogOut, User, Shield, History, Sun, Moon, Lock, Wrench, Building2, Phone, Clock, FolderKanban, Bot, ShoppingCart, FolderTree, Radio, UserCog } from 'lucide-react';
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
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  visibilityKey?: keyof ReturnType<typeof usePermissions>['navVisibility'];
}

// Define all menu items with their visibility keys
const allMenuItems: MenuItem[] = [
  { id: 'dashboard', path: '/', icon: LayoutDashboard, label: 'nav.dashboard', visibilityKey: 'dashboard' },
  { id: 'domainSummary', path: '/domain-summary', icon: Building2, label: 'nav.domainSummary', visibilityKey: 'domainSummary' },
  { id: 'datacenter', path: '/datacenter', icon: Server, label: 'nav.datacenter', visibilityKey: 'datacenter' },
  { id: 'noc', path: '/noc', icon: Radio, label: 'nav.noc', visibilityKey: 'noc' },
  { id: 'resources', path: '/resources', icon: Server, label: 'nav.resources', visibilityKey: 'resources' },
  { id: 'servers', path: '/servers', icon: Server, label: 'nav.servers', visibilityKey: 'servers' },
  { id: 'employees', path: '/employees', icon: Users, label: 'nav.employees', visibilityKey: 'employees' },
  { id: 'employeePermissions', path: '/employee-permissions', icon: Shield, label: 'nav.employeePermissions', visibilityKey: 'employeePermissions' },
  { id: 'vacations', path: '/vacations', icon: Calendar, label: 'nav.vacations', visibilityKey: 'vacations' },
  { id: 'licenses', path: '/licenses', icon: KeyRound, label: 'nav.licenses', visibilityKey: 'licenses' },
  { id: 'tasks', path: '/tasks', icon: ListTodo, label: 'nav.tasks', visibilityKey: 'tasks' },
  { id: 'vault', path: '/vault', icon: Lock, label: 'nav.vault', visibilityKey: 'vault' },
  { id: 'privateVault', path: '/private-vault', icon: Shield, label: 'nav.privateVault', visibilityKey: 'privateVault' },
  { id: 'itTools', path: '/it-tools', icon: Wrench, label: 'nav.itTools', visibilityKey: 'itTools' },
  { id: 'onCall', path: '/on-call', icon: Phone, label: 'nav.onCall', visibilityKey: 'onCall' },
  { id: 'maintenance', path: '/maintenance', icon: Wrench, label: 'nav.maintenance', visibilityKey: 'maintenance' },
  { id: 'lifecycle', path: '/lifecycle', icon: Clock, label: 'nav.lifecycle', visibilityKey: 'lifecycle' },
  { id: 'fileShares', path: '/file-shares', icon: FolderKanban, label: 'nav.fileShares', visibilityKey: 'fileShares' },
  { id: 'scanAgents', path: '/scan-agents', icon: Bot, label: 'nav.scanAgents', visibilityKey: 'scanAgents' },
  { id: 'networks', path: '/networks', icon: Network, label: 'nav.networks', visibilityKey: 'networks' },
  { id: 'networkScan', path: '/network-scan', icon: Wifi, label: 'nav.networkScan', visibilityKey: 'networkScan' },
  { id: 'webApps', path: '/web-apps', icon: Globe, label: 'nav.webApps', visibilityKey: 'webApps' },
  { id: 'employeeReports', path: '/employee-reports', icon: FileSpreadsheet, label: 'nav.employeeReports', visibilityKey: 'employeeReports' },
  { id: 'procurement', path: '/procurement', icon: ShoppingCart, label: 'nav.procurement', visibilityKey: 'procurement' },
  { id: 'reports', path: '/reports', icon: FileBarChart, label: 'nav.reports', visibilityKey: 'reports' },
  { id: 'auditLog', path: '/audit-log', icon: History, label: 'nav.auditLog', visibilityKey: 'auditLog' },
  { id: 'rbacAdmin', path: '/admin/rbac', icon: UserCog, label: 'nav.rbac', visibilityKey: 'rbacAdmin' },
  { id: 'systemHealth', path: '/system-health', icon: Shield, label: 'nav.systemHealth', visibilityKey: 'systemHealth' },
  { id: 'settings', path: '/settings', icon: Settings, label: 'nav.settings', visibilityKey: 'settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { t, language, setLanguage, dir } = useLanguage();
  const { profile, signOut, isSuperAdmin, isAdmin, userRole } = useAuth();
  const { appName } = useAppName();
  const { getSetting } = useAppSettings();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [orderedMenuItems, setOrderedMenuItems] = useState<MenuItem[]>(allMenuItems);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [showHierarchy, setShowHierarchy] = useState(false);
  
  // Use RBAC permission hook
  const { navVisibility, isSuperAdmin: rbacSuperAdmin, hasAdminRole } = usePermissions();

  // Load saved sidebar order from database
  const loadSidebarOrder = useCallback(async () => {
    const saved = await getSetting('sidebar_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const reordered: MenuItem[] = [];
        parsed.forEach((savedItem: { id: string; enabled: boolean }) => {
          if (savedItem.enabled) {
            const menuItem = allMenuItems.find(m => m.id === savedItem.id);
            if (menuItem) {
              reordered.push(menuItem);
            }
          }
        });
        allMenuItems.forEach(item => {
          if (!reordered.find(r => r.id === item.id)) {
            const savedItem = parsed.find((p: { id: string }) => p.id === item.id);
            if (!savedItem || savedItem.enabled !== false) {
              reordered.push(item);
            }
          }
        });
        setOrderedMenuItems(reordered);
      } catch (e) {
        console.error('Failed to parse sidebar order');
        setOrderedMenuItems(allMenuItems);
      }
    }
  }, [getSetting]);

  useEffect(() => {
    loadSidebarOrder();
  }, [loadSidebarOrder, reloadTrigger]);

  useEffect(() => {
    const handleSidebarUpdate = () => {
      setReloadTrigger(prev => prev + 1);
    };
    window.addEventListener('sidebar-order-updated', handleSidebarUpdate);
    return () => {
      window.removeEventListener('sidebar-order-updated', handleSidebarUpdate);
    };
  }, []);

  // Filter menu items based on RBAC permissions (navVisibility)
  const visibleMenuItems = orderedMenuItems.filter(item => {
    if (!item.visibilityKey) return true;
    return navVisibility[item.visibilityKey];
  });

  const CollapseIcon = dir === 'rtl' 
    ? collapsed ? ChevronLeft : ChevronRight 
    : collapsed ? ChevronRight : ChevronLeft;

  const handleSignOut = async () => {
    await signOut();
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
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  rbacSuperAdmin ? "border-destructive text-destructive" 
                    : hasAdminRole ? "border-accent text-accent" 
                    : "border-primary text-primary"
                )}
              >
                {rbacSuperAdmin ? t('employees.superAdmin') : hasAdminRole ? t('employees.admin') : t('employees.employee')}
              </Badge>
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

      {/* Hierarchy Tree Toggle */}
      {hasAdminRole && (
        <Collapsible open={showHierarchy && !collapsed} onOpenChange={setShowHierarchy}>
          <div className={cn("border-b border-sidebar-border", collapsed ? "px-2 py-2" : "px-3 py-2")}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size={collapsed ? "icon" : "sm"}
                className={cn(
                  "w-full text-sidebar-foreground hover:bg-sidebar-accent",
                  collapsed ? "justify-center" : "justify-start gap-2"
                )}
              >
                <FolderTree className="w-4 h-4" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-start">{t('nav.infrastructure')}</span>
                    <ChevronRight className={cn("w-4 h-4 transition-transform", showHierarchy && "rotate-90")} />
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="h-[200px] border-b border-sidebar-border">
              <HierarchyTree />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="py-4 px-2">
          <ul className="space-y-1">
            {visibleMenuItems.map(item => {
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
            })}
          </ul>
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
