import React from 'react';
import { Search, Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import SiteSwitcher from './SiteSwitcher';
import NotificationBell from './NotificationBell';
import { Button } from '@/components/ui/button';

interface AppHeaderProps {
  onSearchClick?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onSearchClick }) => {
  const { dir } = useLanguage();

  const handleSearchClick = () => {
    // Trigger command palette
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <header 
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "h-14 flex items-center px-4 gap-4"
      )}
      dir={dir}
    >
      {/* Site Switcher */}
      <SiteSwitcher />

      {/* Search Trigger */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSearchClick}
        className={cn(
          "flex-1 max-w-md justify-start gap-2 text-muted-foreground",
          "border-dashed hover:border-solid"
        )}
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search resources...</span>
        <span className="sm:hidden">Search...</span>
        <kbd className="hidden md:inline-flex ml-auto pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Right side actions */}
      <div className="flex items-center gap-2 ml-auto">
        <NotificationBell />
      </div>
    </header>
  );
};

export default AppHeader;
