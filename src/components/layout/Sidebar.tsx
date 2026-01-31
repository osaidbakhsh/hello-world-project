import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { t, language, setLanguage, dir } = useLanguage();
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'nav.dashboard' },
    { path: '/servers', icon: Server, label: 'nav.servers' },
    { path: '/employees', icon: Users, label: 'nav.employees' },
    { path: '/licenses', icon: KeyRound, label: 'nav.licenses' },
    { path: '/tasks', icon: ListTodo, label: 'nav.tasks' },
    { path: '/networks', icon: Network, label: 'nav.networks' },
    { path: '/reports', icon: FileBarChart, label: 'nav.reports' },
    { path: '/settings', icon: Settings, label: 'nav.settings' },
  ];

  const CollapseIcon = dir === 'rtl' 
    ? (collapsed ? ChevronLeft : ChevronRight)
    : (collapsed ? ChevronRight : ChevronLeft);

  return (
    <aside
      className={cn(
        'fixed top-0 h-screen sidebar-gradient border-sidebar-border z-50 transition-all duration-300 flex flex-col',
        dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="w-8 h-8 rounded-lg stat-primary flex items-center justify-center">
          <Server className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg text-sidebar-foreground whitespace-nowrap">
            IT Manager
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
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
