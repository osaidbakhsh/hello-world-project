import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Star, Shield, Network, ArrowLeftRight, Type, Code } from 'lucide-react';
import ToolCard from '@/components/it-tools/ToolCard';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Crypto Tools
import TokenGenerator from '@/components/it-tools/crypto/TokenGenerator';
import HashGenerator from '@/components/it-tools/crypto/HashGenerator';
import UUIDGenerator from '@/components/it-tools/crypto/UUIDGenerator';
import Base64Tool from '@/components/it-tools/crypto/Base64Tool';
import PasswordAnalyzer from '@/components/it-tools/crypto/PasswordAnalyzer';

// Network Tools
import SubnetCalculator from '@/components/it-tools/network/SubnetCalculator';
import IPConverter from '@/components/it-tools/network/IPConverter';
import MACGenerator from '@/components/it-tools/network/MACGenerator';
import PortGenerator from '@/components/it-tools/network/PortGenerator';

// Converter Tools
import JsonYamlConverter from '@/components/it-tools/converters/JsonYamlConverter';
import JsonPrettify from '@/components/it-tools/converters/JsonPrettify';
import BaseConverter from '@/components/it-tools/converters/BaseConverter';
import DateConverter from '@/components/it-tools/converters/DateConverter';
import CaseConverter from '@/components/it-tools/converters/CaseConverter';

// Text Tools
import TextDiff from '@/components/it-tools/text/TextDiff';
import UrlEncoder from '@/components/it-tools/text/UrlEncoder';
import LoremIpsum from '@/components/it-tools/text/LoremIpsum';
import TextStats from '@/components/it-tools/text/TextStats';
import RegexTester from '@/components/it-tools/text/RegexTester';

// Development Tools
import CrontabGenerator from '@/components/it-tools/development/CrontabGenerator';
import ChmodCalculator from '@/components/it-tools/development/ChmodCalculator';
import HttpStatusCodes from '@/components/it-tools/development/HttpStatusCodes';
import JwtParser from '@/components/it-tools/development/JwtParser';

interface Tool {
  id: string;
  titleKey: string;
  descKey: string;
  category: 'crypto' | 'network' | 'converters' | 'text' | 'development';
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

const tools: Tool[] = [
  // Crypto
  { id: 'tokenGenerator', titleKey: 'itTools.tokenGenerator', descKey: 'itTools.tokenGeneratorDesc', category: 'crypto', icon: Shield, component: TokenGenerator },
  { id: 'hashGenerator', titleKey: 'itTools.hashGenerator', descKey: 'itTools.hashGeneratorDesc', category: 'crypto', icon: Shield, component: HashGenerator },
  { id: 'uuidGenerator', titleKey: 'itTools.uuidGenerator', descKey: 'itTools.uuidGeneratorDesc', category: 'crypto', icon: Shield, component: UUIDGenerator },
  { id: 'base64Tool', titleKey: 'itTools.base64Tool', descKey: 'itTools.base64ToolDesc', category: 'crypto', icon: Shield, component: Base64Tool },
  { id: 'passwordAnalyzer', titleKey: 'itTools.passwordAnalyzer', descKey: 'itTools.passwordAnalyzerDesc', category: 'crypto', icon: Shield, component: PasswordAnalyzer },
  
  // Network
  { id: 'subnetCalculator', titleKey: 'itTools.subnetCalculator', descKey: 'itTools.subnetCalculatorDesc', category: 'network', icon: Network, component: SubnetCalculator },
  { id: 'ipConverter', titleKey: 'itTools.ipConverter', descKey: 'itTools.ipConverterDesc', category: 'network', icon: Network, component: IPConverter },
  { id: 'macGenerator', titleKey: 'itTools.macGenerator', descKey: 'itTools.macGeneratorDesc', category: 'network', icon: Network, component: MACGenerator },
  { id: 'portGenerator', titleKey: 'itTools.portGenerator', descKey: 'itTools.portGeneratorDesc', category: 'network', icon: Network, component: PortGenerator },
  
  // Converters
  { id: 'jsonYamlConverter', titleKey: 'itTools.jsonYamlConverter', descKey: 'itTools.jsonYamlConverterDesc', category: 'converters', icon: ArrowLeftRight, component: JsonYamlConverter },
  { id: 'jsonPrettify', titleKey: 'itTools.jsonPrettify', descKey: 'itTools.jsonPrettifyDesc', category: 'converters', icon: ArrowLeftRight, component: JsonPrettify },
  { id: 'baseConverter', titleKey: 'itTools.baseConverter', descKey: 'itTools.baseConverterDesc', category: 'converters', icon: ArrowLeftRight, component: BaseConverter },
  { id: 'dateConverter', titleKey: 'itTools.dateConverter', descKey: 'itTools.dateConverterDesc', category: 'converters', icon: ArrowLeftRight, component: DateConverter },
  { id: 'caseConverter', titleKey: 'itTools.caseConverter', descKey: 'itTools.caseConverterDesc', category: 'converters', icon: ArrowLeftRight, component: CaseConverter },
  
  // Text
  { id: 'textDiff', titleKey: 'itTools.textDiff', descKey: 'itTools.textDiffDesc', category: 'text', icon: Type, component: TextDiff },
  { id: 'urlEncoder', titleKey: 'itTools.urlEncoder', descKey: 'itTools.urlEncoderDesc', category: 'text', icon: Type, component: UrlEncoder },
  { id: 'loremIpsum', titleKey: 'itTools.loremIpsum', descKey: 'itTools.loremIpsumDesc', category: 'text', icon: Type, component: LoremIpsum },
  { id: 'textStats', titleKey: 'itTools.textStats', descKey: 'itTools.textStatsDesc', category: 'text', icon: Type, component: TextStats },
  { id: 'regexTester', titleKey: 'itTools.regexTester', descKey: 'itTools.regexTesterDesc', category: 'text', icon: Type, component: RegexTester },
  
  // Development
  { id: 'crontabGenerator', titleKey: 'itTools.crontabGenerator', descKey: 'itTools.crontabGeneratorDesc', category: 'development', icon: Code, component: CrontabGenerator },
  { id: 'chmodCalculator', titleKey: 'itTools.chmodCalculator', descKey: 'itTools.chmodCalculatorDesc', category: 'development', icon: Code, component: ChmodCalculator },
  { id: 'httpStatusCodes', titleKey: 'itTools.httpStatusCodes', descKey: 'itTools.httpStatusCodesDesc', category: 'development', icon: Code, component: HttpStatusCodes },
  { id: 'jwtParser', titleKey: 'itTools.jwtParser', descKey: 'itTools.jwtParserDesc', category: 'development', icon: Code, component: JwtParser },
];

const ITTools: React.FC = () => {
  const { t, dir } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useLocalStorage<string[]>('it-tools-favorites', []);
  const [activeTab, setActiveTab] = useState('all');

  const toggleFavorite = (toolId: string) => {
    setFavorites(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const filteredTools = useMemo(() => {
    let filtered = tools;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tool => 
        t(tool.titleKey).toLowerCase().includes(query) ||
        t(tool.descKey).toLowerCase().includes(query)
      );
    }

    if (activeTab === 'favorites') {
      filtered = filtered.filter(tool => favorites.includes(tool.id));
    } else if (activeTab !== 'all') {
      filtered = filtered.filter(tool => tool.category === activeTab);
    }

    return filtered;
  }, [searchQuery, activeTab, favorites, t]);

  const categories = [
    { id: 'all', labelKey: 'common.all', icon: null },
    { id: 'favorites', labelKey: 'itTools.favorites', icon: Star },
    { id: 'crypto', labelKey: 'itTools.crypto', icon: Shield },
    { id: 'network', labelKey: 'itTools.network', icon: Network },
    { id: 'converters', labelKey: 'itTools.converters', icon: ArrowLeftRight },
    { id: 'text', labelKey: 'itTools.text', icon: Type },
    { id: 'development', labelKey: 'itTools.development', icon: Code },
  ];

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('itTools.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('itTools.subtitle')}</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('itTools.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="flex items-center gap-1.5 data-[state=active]:bg-background"
            >
              {cat.icon && <cat.icon className="h-4 w-4" />}
              {t(cat.labelKey)}
              {cat.id === 'favorites' && favorites.length > 0 && (
                <span className="ms-1 rounded-full bg-primary/20 px-1.5 text-xs">
                  {favorites.length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredTools.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {activeTab === 'favorites' 
                ? t('itTools.noFavorites')
                : t('common.noData')
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  isFavorite={favorites.includes(tool.id)}
                  onToggleFavorite={() => toggleFavorite(tool.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ITTools;
