import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHierarchy, HierarchyLevel } from '@/contexts/HierarchyContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Search,
  MapPin,
  Globe,
  Building2,
  Server,
  Network,
  Cpu,
  Monitor,
  Loader2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const levelIcons: Record<HierarchyLevel, React.ElementType> = {
  site: MapPin,
  domain: Globe,
  datacenter: Building2,
  cluster: Server,
  network: Network,
  node: Cpu,
  vm: Monitor,
};

const levelLabels: Record<HierarchyLevel, { en: string; ar: string }> = {
  site: { en: 'Site', ar: 'موقع' },
  domain: { en: 'Domain', ar: 'نطاق' },
  datacenter: { en: 'Datacenter', ar: 'مركز بيانات' },
  cluster: { en: 'Cluster', ar: 'كلستر' },
  network: { en: 'Network', ar: 'شبكة' },
  node: { en: 'Node', ar: 'نود' },
  vm: { en: 'VM', ar: 'جهاز افتراضي' },
};

const levelColors: Record<HierarchyLevel, string> = {
  site: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  domain: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  datacenter: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  cluster: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  network: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  node: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  vm: 'bg-primary/10 text-primary border-primary/20',
};

interface GlobalSearchProps {
  collapsed?: boolean;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { searchResults, searchQuery, setSearchQuery, isSearching, fetchPathToNode, setCurrentPath, expandToNode } = useHierarchy();
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(async (nodeId: string, level: HierarchyLevel) => {
    // Fetch path and expand tree
    const path = await fetchPathToNode(nodeId, level);
    setCurrentPath(path);
    expandToNode(nodeId, path);
    
    // Navigate to resource
    navigate(`/resource/${level}/${nodeId}`);
    setOpen(false);
    setSearchQuery('');
  }, [navigate, fetchPathToNode, setCurrentPath, expandToNode, setSearchQuery]);

  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="w-full">
            <Search className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" side="right" align="start">
          <SearchContent
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            isSearching={isSearching}
            onSelect={handleSelect}
            language={language}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 text-muted-foreground font-normal"
        >
          <Search className="w-4 h-4" />
          <span>{language === 'ar' ? 'بحث...' : 'Search...'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <SearchContent
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          isSearching={isSearching}
          onSelect={handleSelect}
          language={language}
        />
      </PopoverContent>
    </Popover>
  );
};

interface SearchContentProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Array<{ id: string; name: string; level: HierarchyLevel }>;
  isSearching: boolean;
  onSelect: (id: string, level: HierarchyLevel) => void;
  language: string;
}

const SearchContent: React.FC<SearchContentProps> = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  onSelect,
  language,
}) => {
  return (
    <Command shouldFilter={false}>
      <div className="flex items-center border-b px-3">
        <Search className="w-4 h-4 shrink-0 opacity-50" />
        <CommandInput
          placeholder={language === 'ar' ? 'ابحث عن أي مورد...' : 'Search any resource...'}
          value={searchQuery}
          onValueChange={setSearchQuery}
          className="flex-1"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSearchQuery('')}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      <CommandList>
        {isSearching ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
          <CommandEmpty>
            {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
          </CommandEmpty>
        ) : searchResults.length > 0 ? (
          <CommandGroup heading={language === 'ar' ? 'النتائج' : 'Results'}>
            <ScrollArea className="max-h-[300px]">
              {searchResults.map((result) => {
                const Icon = levelIcons[result.level];
                const label = levelLabels[result.level][language === 'ar' ? 'ar' : 'en'];
                const colorClass = levelColors[result.level];
                
                return (
                  <CommandItem
                    key={`${result.level}-${result.id}`}
                    onSelect={() => onSelect(result.id, result.level)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Icon className={cn('w-4 h-4', colorClass.split(' ')[1])} />
                    <span className="flex-1 truncate">{result.name}</span>
                    <Badge variant="outline" className={cn('text-[10px] px-1.5', colorClass)}>
                      {label}
                    </Badge>
                  </CommandItem>
                );
              })}
            </ScrollArea>
          </CommandGroup>
        ) : searchQuery.length < 2 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {language === 'ar' ? 'اكتب حرفين على الأقل للبحث' : 'Type at least 2 characters to search'}
          </div>
        ) : null}
      </CommandList>
    </Command>
  );
};

export default GlobalSearch;
