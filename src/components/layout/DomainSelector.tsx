import React from 'react';
import { ChevronDown, Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDomain, type Domain } from '@/contexts/DomainContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface DomainSelectorProps {
  className?: string;
  compact?: boolean;
}

const DomainSelector: React.FC<DomainSelectorProps> = ({ className, compact = false }) => {
  const { t } = useLanguage();
  const { selectedDomain, setSelectedDomain, domains, isLoading } = useDomain();

  if (isLoading) {
    return <Skeleton className="h-9 w-40" />;
  }

  if (domains.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn(
            "justify-between gap-2 min-w-[140px]",
            !selectedDomain && "border-dashed",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-[120px]">
              {selectedDomain ? selectedDomain.name : 'All Domains'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Select Domain</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* All Domains option */}
        <DropdownMenuItem
          onClick={() => setSelectedDomain(null)}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>All Domains</span>
            </div>
            {!selectedDomain && <Check className="h-4 w-4 text-primary" />}
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Domain list */}
        {domains.map((domain) => (
          <DropdownMenuItem
            key={domain.id}
            onClick={() => setSelectedDomain(domain)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{domain.name}</span>
                {domain.fqdn && (
                  <span className="text-xs text-muted-foreground">{domain.fqdn}</span>
                )}
              </div>
              {selectedDomain?.id === domain.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DomainSelector;
