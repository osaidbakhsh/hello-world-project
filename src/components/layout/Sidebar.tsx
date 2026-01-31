import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppName } from '@/hooks/useSupabaseData';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import NotificationBell from './NotificationBell';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { t, language, setLanguage, dir } = useLanguage();
  const { profile, signOut, isAdmin } = useAuth();
  const { appName } = useAppName();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'nav.dashboard' },
    { path: '/servers', icon: Server, label: 'nav.servers' },
    { path: '/employees', icon: Users, label: 'nav.employees', adminOnly: true },
    { path: '/employee-permissions', icon: Shield, label: 'nav.employeePermissions', adminOnly: true },
    { path: '/vacations', icon: Calendar, label: 'nav.vacations' },
    { path: '/licenses', icon: KeyRound, label: 'nav.licenses' },
    { path: '/tasks', icon: ListTodo, label: 'nav.tasks' },
    { path: '/vault', icon: Lock, label: 'nav.vault' },
    { path: '/networks', icon: Network, label: 'nav.networks', adminOnly: true },
    { path: '/network-scan', icon: Wifi, label: 'nav.networkScan', adminOnly: true },
    { path: '/web-apps', icon: Globe, label: 'nav.webApps', adminOnly: true },
    { path: '/employee-reports', icon: FileSpreadsheet, label: 'nav.employeeReports', adminOnly: true },
    { path: '/reports', icon: FileBarChart, label: 'nav.reports' },
    { path: '/audit-log', icon: History, label: 'nav.auditLog', adminOnly: true },
    { path: '/settings', icon: Settings, label: 'nav.settings', adminOnly: true },
  ];

  // Filter menu items based on admin status
  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

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
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
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
