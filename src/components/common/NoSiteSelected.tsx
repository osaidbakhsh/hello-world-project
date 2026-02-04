import React from 'react';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSite } from '@/contexts/SiteContext';

interface NoSiteSelectedProps {
  message?: string;
}

const NoSiteSelected: React.FC<NoSiteSelectedProps> = ({ 
  message = "Please select a site from the dropdown above to view data." 
}) => {
  const { sites, setSelectedSite } = useSite();

  const handleSelectFirstSite = () => {
    if (sites.length > 0) {
      setSelectedSite(sites[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Building2 className="w-10 h-10 text-muted-foreground" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">Select a Site</h3>
        
        <p className="text-muted-foreground mb-6">
          {message}
        </p>

        {sites.length > 0 && (
          <Button onClick={handleSelectFirstSite} variant="outline" className="gap-2">
            <Building2 className="w-4 h-4" />
            Select {sites[0].name}
          </Button>
        )}
      </div>
    </div>
  );
};

export default NoSiteSelected;
