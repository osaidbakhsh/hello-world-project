import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Building2, Server, Box, Globe, Monitor, ChevronRight } from 'lucide-react';
import { useSite } from '@/contexts/SiteContext';
import { useDomain } from '@/contexts/DomainContext';
import { useHierarchy, type HierarchyLevel } from '@/contexts/HierarchyContext';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface BreadcrumbConfig {
  level: HierarchyLevel | 'home';
  icon: React.ComponentType<{ className?: string }>;
  getLabel: () => string | null;
  getPath: () => string;
  isActive: boolean;
}

interface HierarchyBreadcrumbsProps {
  currentLevel?: HierarchyLevel;
  showHome?: boolean;
}

const HierarchyBreadcrumbs: React.FC<HierarchyBreadcrumbsProps> = ({ 
  currentLevel,
  showHome = true,
}) => {
  const { selectedSite } = useSite();
  const { selectedDomain } = useDomain();
  const { currentPath } = useHierarchy();

  // Build breadcrumb items based on current context
  const breadcrumbs: BreadcrumbConfig[] = [];

  if (showHome) {
    breadcrumbs.push({
      level: 'home',
      icon: Home,
      getLabel: () => 'Dashboard',
      getPath: () => '/',
      isActive: false,
    });
  }

  // Add site
  if (selectedSite) {
    breadcrumbs.push({
      level: 'site',
      icon: Building2,
      getLabel: () => selectedSite.name,
      getPath: () => '/',
      isActive: currentLevel === 'site',
    });
  }

  // Add domain if selected
  if (selectedDomain) {
    breadcrumbs.push({
      level: 'domain',
      icon: Globe,
      getLabel: () => selectedDomain.name,
      getPath: () => `/domain-summary`,
      isActive: currentLevel === 'domain',
    });
  }

  // Add hierarchy path items
  currentPath.forEach((node) => {
    const IconMap: Record<HierarchyLevel, React.ComponentType<{ className?: string }>> = {
      site: Building2,
      datacenter: Server,
      cluster: Box,
      node: Server,
      domain: Globe,
      vm: Monitor,
    };

    breadcrumbs.push({
      level: node.level,
      icon: IconMap[node.level] || Box,
      getLabel: () => node.name,
      getPath: () => {
        switch (node.level) {
          case 'datacenter': return `/datacenter/${node.id}`;
          case 'cluster': return `/datacenter?cluster=${node.id}`;
          case 'vm': return `/resources/${node.id}`;
          default: return '/';
        }
      },
      isActive: currentLevel === node.level,
    });
  });

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => {
          const Icon = crumb.icon;
          const label = crumb.getLabel();
          const isLast = index === breadcrumbs.length - 1;

          if (!label) return null;

          return (
            <React.Fragment key={`${crumb.level}-${index}`}>
              <BreadcrumbItem>
                {isLast || crumb.isActive ? (
                  <BreadcrumbPage className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.getPath()} className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default HierarchyBreadcrumbs;
