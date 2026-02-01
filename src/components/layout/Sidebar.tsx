import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppName, useAppSettings } from '@/hooks/useSupabaseData';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Server,
  Users,
  KeyRound,
  ListTodo,
  Network,
  FileBarChart,
  Settings,
  Globe,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileSpreadsheet,
  Wifi,
  LogOut,
  User,
  Shield,
  History,
  Sun,
  Moon,
  Lock,
  Wrench,
  Building2,
  Phone,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import NotificationBell from './NotificationBell';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  id: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  adminOnly?: boolean;
}

const allMenuItems: MenuItem[] = [
  { id: 'dashboard', path: '/', icon: LayoutDashboard, label: 'nav.dashboard' },
  { id: 'domainSummary', path: '/domain-summary', icon: Building2, label: 'nav.domainSummary', adminOnly: true },
  { id: 'servers', path: '/servers', icon: Server, label: 'nav.servers' },
  { id: 'employees', path: '/employees', icon: Users, label: 'nav.employees', adminOnly: true },
  { id: 'employeePermissions', path: '/employee-permissions', icon: Shield, label: 'nav.employeePermissions', adminOnly: true },
  { id: 'vacations', path: '/vacations', icon: Calendar, label: 'nav.vacations' },
  { id: 'licenses', path: '/licenses', icon: KeyRound, label: 'nav.licenses' },
  { id: 'tasks', path: '/tasks', icon: ListTodo, label: 'nav.tasks' },
  { id: 'vault', path: '/vault', icon: Lock, label: 'nav.vault' },
  { id: 'itTools', path: '/it-tools', icon: Wrench, label: 'nav.itTools' },
  { id: 'onCall', path: '/on-call', icon: Phone, label: 'nav.onCall', adminOnly: true },
  { id: 'maintenance', path: '/maintenance', icon: Wrench, label: 'nav.maintenance', adminOnly: true },
  { id: 'lifecycle', path: '/lifecycle', icon: Clock, label: 'nav.lifecycle', adminOnly: true },
  { id: 'networks', path: '/networks', icon: Network, label: 'nav.networks', adminOnly: true },
  { id: 'networkScan', path: '/network-scan', icon: Wifi, label: 'nav.networkScan', adminOnly: true },
  { id: 'webApps', path: '/web-apps', icon: Globe, label: 'nav.webApps', adminOnly: true },
  { id: 'employeeReports', path: '/employee-reports', icon: FileSpreadsheet, label: 'nav.employeeReports', adminOnly: true },
  { id: 'reports', path: '/reports', icon: FileBarChart, label: 'nav.reports' },
  { id: 'auditLog', path: '/audit-log', icon: History, label: 'nav.auditLog', adminOnly: true },
  { id: 'settings', path: '/settings', icon: Settings, label: 'nav.settings', adminOnly: true },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { t, language, setLanguage, dir } = useLanguage();
  const { profile, signOut, isAdmin } = useAuth();
  const { appName } = useAppName();
  const { getSetting } = useAppSettings();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [orderedMenuItems, setOrderedMenuItems] = useState<MenuItem[]>(allMenuItems);

  // Load saved sidebar order from database
  const loadSidebarOrder = useCallback(async () => {
    const saved = await getSetting('sidebar_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Reorder items based on saved order and enabled status
        const reordered: MenuItem[] = [];
        parsed.forEach((savedItem: { id: string; enabled: boolean }) => {
          if (savedItem.enabled) {
            const menuItem = allMenuItems.find(m => m.id === savedItem.id);
            if (menuItem) {
              reordered.push(menuItem);
            }
          }
        });
        // Add any new items that might not be in the saved order
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
  }, [loadSidebarOrder]);

  // Filter menu items based on admin status
  const visibleMenuItems = orderedMenuItems.filter(item => !item.adminOnly || isAdmin);

  const CollapseIcon = dir === 'rtl' 
    ? (collapsed ? ChevronLeft : ChevronRight)
    : (collapsed ? ChevronRight : ChevronLeft);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <aside
      className={cn(
        'fixed top-0 h-screen sidebar-gradient border-sidebar-border z-50 transition-all duration-300 flex flex-col',
        dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo & Offline Mode */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="w-8 h-8 rounded-lg stat-primary flex items-center justify-center">
          <Server className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col flex-1">
            <span className="font-bold text-lg text-sidebar-foreground whitespace-nowrap">
              IT <span className="text-accent">Infrastructure</span>
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
                  isAdmin ? "border-accent text-accent" : "border-primary text-primary"
                )}
              >
                {isAdmin ? t('employees.admin') : t('employees.employee')}
              </Badge>
            </div>
            {/* Notification Bell */}
            <NotificationBell />
          </div>
        </div>
      )}

      {/* Notification Bell for collapsed sidebar */}
      {profile && collapsed && (
        <div className="px-2 py-2 border-b border-sidebar-border flex justify-center">
          <NotificationBell />
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="py-4 px-2">
          <ul className="space-y-1">
          {visibleMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            const linkContent = (
              <Link
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  isActive 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' 
                    : 'text-sidebar-foreground',
                  collapsed && 'justify-center'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="truncate">{t(item.label)}</span>
                )}
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
                ) : (
                  linkContent
                )}
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
          className={cn(
            'w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            collapsed ? 'justify-center' : 'justify-start gap-2'
          )}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {!collapsed && (theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode'))}
        </Button>

        {/* Language Toggle */}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className={cn(
            'w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            collapsed ? 'justify-center' : 'justify-start gap-2'
          )}
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
          className={cn(
            'w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive',
            collapsed ? 'justify-center' : 'justify-start gap-2'
          )}
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
