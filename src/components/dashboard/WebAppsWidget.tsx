import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { useSiteDomains } from '@/hooks/useSiteDomains';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { 
  Globe, 
  ExternalLink, 
  Settings,
  Server,
  Mail,
  FileText,
  Database,
  Shield,
  Cloud,
  Monitor,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Map icon names to Lucide icons
const iconMap: Record<string, React.ElementType> = {
  globe: Globe,
  server: Server,
  mail: Mail,
  file: FileText,
  database: Database,
  shield: Shield,
  cloud: Cloud,
  monitor: Monitor,
  layers: Layers,
};

interface WebsiteApplication {
  id: string;
  name: string;
  url: string;
  icon: string | null;
  category: string | null;
  description: string | null;
  domain_id: string | null;
  is_active: boolean;
  sort_order: number | null;
}

const WebAppsWidget: React.FC = () => {
  const { t, dir } = useLanguage();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [], isLoading: domainsLoading } = useSiteDomains();

  // Fetch site-only apps (apps where domain_id is in siteDomainIds)
  const { data: apps = [], isLoading: appsLoading } = useQuery({
    queryKey: ['dashboard-webapps', selectedSite?.id, siteDomainIds],
    queryFn: async () => {
      if (!selectedSite || siteDomainIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('website_applications')
        .select('*')
        .eq('is_active', true)
        .in('domain_id', siteDomainIds)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return (data as WebsiteApplication[]) || [];
    },
    enabled: !!selectedSite && siteDomainIds.length > 0 && !domainsLoading,
    staleTime: 30 * 1000,
  });

  const isLoading = domainsLoading || appsLoading;

  const handleAppClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getIcon = (iconName: string | null): React.ElementType => {
    if (!iconName) return Globe;
    return iconMap[iconName.toLowerCase()] || Globe;
  };

  // Show "no site selected" state
  if (!selectedSite) {
    return (
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {t('webApps.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('common.noSiteSelected') || 'Please select a site'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCategoryColor = (category: string | null): string => {
    switch (category?.toLowerCase()) {
      case 'infrastructure':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'security':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'monitoring':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'communication':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'development':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (isLoading) {
    return (
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {t('webApps.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {t('webApps.title')}
          </CardTitle>
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/web-apps')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-4 h-4 me-1" />
              {t('webApps.manage')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {apps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('common.noData')}</p>
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => navigate('/web-apps')}
              >
                {t('webApps.add')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {apps.slice(0, 8).map((app) => {
              const IconComponent = getIcon(app.icon);
              
              return (
                <button
                  key={app.id}
                  onClick={() => handleAppClick(app.url)}
                  className={cn(
                    "group relative p-4 rounded-xl border-2 border-border/50",
                    "bg-gradient-to-br from-card to-muted/30",
                    "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
                    "transition-all duration-200 text-start",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  )}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        "p-2 rounded-lg",
                        getCategoryColor(app.category)
                      )}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm line-clamp-1">{app.name}</h4>
                      {app.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {app.description}
                        </p>
                      )}
                    </div>
                    {app.category && (
                      <Badge variant="secondary" className="text-[10px] w-fit mt-1">
                        {app.category}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        
        {apps.length > 8 && (
          <div className="mt-4 text-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/web-apps')}
            >
              {t('common.viewAll')} ({apps.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WebAppsWidget;
