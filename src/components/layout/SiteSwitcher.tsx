import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Settings, Plus, Loader2 } from 'lucide-react';
import { useSite } from '@/contexts/SiteContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import SiteManagementDialog from '@/components/sites/SiteManagementDialog';

const SiteSwitcher: React.FC = () => {
  const { selectedSite, setSelectedSite, sites, isLoading } = useSite();
  const { user } = useAuth();
  const { isAdmin } = useUserRole(user?.id ?? null);
  const [showManagement, setShowManagement] = useState(false);

  // Keyboard shortcut: Ctrl+Shift+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        const trigger = document.querySelector('[data-site-switcher-trigger]') as HTMLButtonElement;
        trigger?.click();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading sites...</span>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowManagement(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Site
        </Button>
        <SiteManagementDialog 
          open={showManagement} 
          onOpenChange={setShowManagement} 
        />
      </div>
    );
  }

  return (
    <>
      <Select
        value={selectedSite?.id || ''}
        onValueChange={(value) => {
          const site = sites.find(s => s.id === value);
          if (site) setSelectedSite(site);
        }}
      >
        <SelectTrigger 
          data-site-switcher-trigger
          className={cn(
            "w-[200px] h-9 gap-2 border-dashed",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:ring-1 focus:ring-primary"
          )}
        >
          <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Select site">
            {selectedSite && (
              <div className="flex items-center gap-2 truncate">
                <span className="truncate">{selectedSite.name}</span>
                {selectedSite.code && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                    {selectedSite.code}
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent align="start" className="w-[280px]">
          {sites.map((site) => (
            <SelectItem key={site.id} value={site.id} className="py-2">
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{site.name}</span>
                  {site.city && (
                    <span className="text-xs text-muted-foreground truncate">
                      {site.city}{site.region ? `, ${site.region}` : ''}
                    </span>
                  )}
                </div>
                {site.code && (
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] shrink-0">
                    {site.code}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
          
          {isAdmin && (
            <>
              <Separator className="my-1" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowManagement(true);
                }}
              >
                <Settings className="w-4 h-4" />
                Manage Sites
              </Button>
            </>
          )}
        </SelectContent>
      </Select>

      <SiteManagementDialog 
        open={showManagement} 
        onOpenChange={setShowManagement} 
      />
    </>
  );
};

export default SiteSwitcher;
