import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import Sidebar from './Sidebar';
import AppHeader from './AppHeader';
import CommandPalette from '@/components/hierarchy/CommandPalette';

const Layout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { dir } = useLanguage();

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Global Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette />
      
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <main
        className={cn(
          'min-h-screen transition-all duration-300 flex flex-col',
          dir === 'rtl' 
            ? (sidebarCollapsed ? 'mr-16' : 'mr-64')
            : (sidebarCollapsed ? 'ml-16' : 'ml-64')
        )}
      >
        <AppHeader />
        <div className="flex-1 p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
