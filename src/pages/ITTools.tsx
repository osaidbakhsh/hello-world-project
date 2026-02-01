import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Star, Shield, Network, ArrowLeftRight, Type, Code, Globe, Image, Calculator, Timer, Database } from 'lucide-react';
import ToolCard from '@/components/it-tools/ToolCard';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Crypto Tools
import TokenGenerator from '@/components/it-tools/crypto/TokenGenerator';
import HashGenerator from '@/components/it-tools/crypto/HashGenerator';
import UUIDGenerator from '@/components/it-tools/crypto/UUIDGenerator';
import Base64Tool from '@/components/it-tools/crypto/Base64Tool';
import PasswordAnalyzer from '@/components/it-tools/crypto/PasswordAnalyzer';
import BcryptGenerator from '@/components/it-tools/crypto/BcryptGenerator';
import UlidGenerator from '@/components/it-tools/crypto/UlidGenerator';
import EncryptDecryptText from '@/components/it-tools/crypto/EncryptDecryptText';
import HmacGenerator from '@/components/it-tools/crypto/HmacGenerator';
import Bip39Generator from '@/components/it-tools/crypto/Bip39Generator';
import RsaKeyGenerator from '@/components/it-tools/crypto/RsaKeyGenerator';

// Network Tools
import SubnetCalculator from '@/components/it-tools/network/SubnetCalculator';
import IPConverter from '@/components/it-tools/network/IPConverter';
import MACGenerator from '@/components/it-tools/network/MACGenerator';
import PortGenerator from '@/components/it-tools/network/PortGenerator';
import IPv4RangeExpander from '@/components/it-tools/network/IPv4RangeExpander';
import MacAddressLookup from '@/components/it-tools/network/MacAddressLookup';
import IPv6UlaGenerator from '@/components/it-tools/network/IPv6UlaGenerator';

// Converter Tools
import JsonYamlConverter from '@/components/it-tools/converters/JsonYamlConverter';
import JsonPrettify from '@/components/it-tools/converters/JsonPrettify';
import BaseConverter from '@/components/it-tools/converters/BaseConverter';
import DateConverter from '@/components/it-tools/converters/DateConverter';
import CaseConverter from '@/components/it-tools/converters/CaseConverter';
import RomanConverter from '@/components/it-tools/converters/RomanConverter';
import ColorConverter from '@/components/it-tools/converters/ColorConverter';
import NatoAlphabet from '@/components/it-tools/converters/NatoAlphabet';
import TextToBinary from '@/components/it-tools/converters/TextToBinary';
import TextToUnicode from '@/components/it-tools/converters/TextToUnicode';
import XmlJsonConverter from '@/components/it-tools/converters/XmlJsonConverter';
import ListConverter from '@/components/it-tools/converters/ListConverter';
import MarkdownToHtml from '@/components/it-tools/converters/MarkdownToHtml';
import Base64FileConverter from '@/components/it-tools/converters/Base64FileConverter';
import JsonToCsv from '@/components/it-tools/converters/JsonToCsv';

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

// Web Tools
import HtmlEntities from '@/components/it-tools/web/HtmlEntities';
import UrlParser from '@/components/it-tools/web/UrlParser';
import DeviceInfo from '@/components/it-tools/web/DeviceInfo';
import BasicAuthGenerator from '@/components/it-tools/web/BasicAuthGenerator';
import OtpGenerator from '@/components/it-tools/web/OtpGenerator';
import MimeTypes from '@/components/it-tools/web/MimeTypes';
import KeycodeInfo from '@/components/it-tools/web/KeycodeInfo';
import SlugifyString from '@/components/it-tools/web/SlugifyString';
import UserAgentParser from '@/components/it-tools/web/UserAgentParser';
import JsonDiff from '@/components/it-tools/web/JsonDiff';
import SafelinkDecoder from '@/components/it-tools/web/SafelinkDecoder';
import OpenGraphGenerator from '@/components/it-tools/web/OpenGraphGenerator';

// Image Tools
import QrCodeGenerator from '@/components/it-tools/images/QrCodeGenerator';
import WifiQrGenerator from '@/components/it-tools/images/WifiQrGenerator';
import SvgPlaceholder from '@/components/it-tools/images/SvgPlaceholder';

interface Tool {
  id: string;
  titleKey: string;
  descKey: string;
  category: 'crypto' | 'network' | 'converters' | 'text' | 'development' | 'web' | 'images';
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
  { id: 'bcryptGenerator', titleKey: 'itTools.bcryptGenerator', descKey: 'itTools.bcryptGeneratorDesc', category: 'crypto', icon: Shield, component: BcryptGenerator },
  { id: 'ulidGenerator', titleKey: 'itTools.ulidGenerator', descKey: 'itTools.ulidGeneratorDesc', category: 'crypto', icon: Shield, component: UlidGenerator },
  { id: 'encryptDecrypt', titleKey: 'itTools.encryptDecrypt', descKey: 'itTools.encryptDecryptDesc', category: 'crypto', icon: Shield, component: EncryptDecryptText },
  { id: 'hmacGenerator', titleKey: 'itTools.hmacGenerator', descKey: 'itTools.hmacGeneratorDesc', category: 'crypto', icon: Shield, component: HmacGenerator },
  { id: 'bip39Generator', titleKey: 'itTools.bip39Generator', descKey: 'itTools.bip39GeneratorDesc', category: 'crypto', icon: Shield, component: Bip39Generator },
  { id: 'rsaKeyGenerator', titleKey: 'itTools.rsaKeyGenerator', descKey: 'itTools.rsaKeyGeneratorDesc', category: 'crypto', icon: Shield, component: RsaKeyGenerator },
  
  // Network
  { id: 'subnetCalculator', titleKey: 'itTools.subnetCalculator', descKey: 'itTools.subnetCalculatorDesc', category: 'network', icon: Network, component: SubnetCalculator },
  { id: 'ipConverter', titleKey: 'itTools.ipConverter', descKey: 'itTools.ipConverterDesc', category: 'network', icon: Network, component: IPConverter },
  { id: 'macGenerator', titleKey: 'itTools.macGenerator', descKey: 'itTools.macGeneratorDesc', category: 'network', icon: Network, component: MACGenerator },
  { id: 'portGenerator', titleKey: 'itTools.portGenerator', descKey: 'itTools.portGeneratorDesc', category: 'network', icon: Network, component: PortGenerator },
  { id: 'ipv4RangeExpander', titleKey: 'itTools.ipv4RangeExpander', descKey: 'itTools.ipv4RangeExpanderDesc', category: 'network', icon: Network, component: IPv4RangeExpander },
  { id: 'macAddressLookup', titleKey: 'itTools.macAddressLookup', descKey: 'itTools.macAddressLookupDesc', category: 'network', icon: Network, component: MacAddressLookup },
  { id: 'ipv6UlaGenerator', titleKey: 'itTools.ipv6UlaGenerator', descKey: 'itTools.ipv6UlaGeneratorDesc', category: 'network', icon: Network, component: IPv6UlaGenerator },
  
  // Converters
  { id: 'jsonYamlConverter', titleKey: 'itTools.jsonYamlConverter', descKey: 'itTools.jsonYamlConverterDesc', category: 'converters', icon: ArrowLeftRight, component: JsonYamlConverter },
  { id: 'jsonPrettify', titleKey: 'itTools.jsonPrettify', descKey: 'itTools.jsonPrettifyDesc', category: 'converters', icon: ArrowLeftRight, component: JsonPrettify },
  { id: 'baseConverter', titleKey: 'itTools.baseConverter', descKey: 'itTools.baseConverterDesc', category: 'converters', icon: ArrowLeftRight, component: BaseConverter },
  { id: 'dateConverter', titleKey: 'itTools.dateConverter', descKey: 'itTools.dateConverterDesc', category: 'converters', icon: ArrowLeftRight, component: DateConverter },
  { id: 'caseConverter', titleKey: 'itTools.caseConverter', descKey: 'itTools.caseConverterDesc', category: 'converters', icon: ArrowLeftRight, component: CaseConverter },
  { id: 'romanConverter', titleKey: 'itTools.romanConverter', descKey: 'itTools.romanConverterDesc', category: 'converters', icon: ArrowLeftRight, component: RomanConverter },
  { id: 'colorConverter', titleKey: 'itTools.colorConverter', descKey: 'itTools.colorConverterDesc', category: 'converters', icon: ArrowLeftRight, component: ColorConverter },
  { id: 'natoAlphabet', titleKey: 'itTools.natoAlphabet', descKey: 'itTools.natoAlphabetDesc', category: 'converters', icon: ArrowLeftRight, component: NatoAlphabet },
  { id: 'textToBinary', titleKey: 'itTools.textToBinary', descKey: 'itTools.textToBinaryDesc', category: 'converters', icon: ArrowLeftRight, component: TextToBinary },
  { id: 'textToUnicode', titleKey: 'itTools.textToUnicode', descKey: 'itTools.textToUnicodeDesc', category: 'converters', icon: ArrowLeftRight, component: TextToUnicode },
  { id: 'xmlJsonConverter', titleKey: 'itTools.xmlJsonConverter', descKey: 'itTools.xmlJsonConverterDesc', category: 'converters', icon: ArrowLeftRight, component: XmlJsonConverter },
  { id: 'listConverter', titleKey: 'itTools.listConverter', descKey: 'itTools.listConverterDesc', category: 'converters', icon: ArrowLeftRight, component: ListConverter },
  { id: 'markdownToHtml', titleKey: 'itTools.markdownToHtml', descKey: 'itTools.markdownToHtmlDesc', category: 'converters', icon: ArrowLeftRight, component: MarkdownToHtml },
  { id: 'base64FileConverter', titleKey: 'itTools.base64FileConverter', descKey: 'itTools.base64FileConverterDesc', category: 'converters', icon: ArrowLeftRight, component: Base64FileConverter },
  { id: 'jsonToCsv', titleKey: 'itTools.jsonToCsv', descKey: 'itTools.jsonToCsvDesc', category: 'converters', icon: ArrowLeftRight, component: JsonToCsv },
  
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

  // Web
  { id: 'htmlEntities', titleKey: 'itTools.htmlEntities', descKey: 'itTools.htmlEntitiesDesc', category: 'web', icon: Globe, component: HtmlEntities },
  { id: 'urlParser', titleKey: 'itTools.urlParser', descKey: 'itTools.urlParserDesc', category: 'web', icon: Globe, component: UrlParser },
  { id: 'deviceInfo', titleKey: 'itTools.deviceInfo', descKey: 'itTools.deviceInfoDesc', category: 'web', icon: Globe, component: DeviceInfo },
  { id: 'basicAuthGenerator', titleKey: 'itTools.basicAuthGenerator', descKey: 'itTools.basicAuthGeneratorDesc', category: 'web', icon: Globe, component: BasicAuthGenerator },
  { id: 'otpGenerator', titleKey: 'itTools.otpGenerator', descKey: 'itTools.otpGeneratorDesc', category: 'web', icon: Globe, component: OtpGenerator },
  { id: 'mimeTypes', titleKey: 'itTools.mimeTypes', descKey: 'itTools.mimeTypesDesc', category: 'web', icon: Globe, component: MimeTypes },
  { id: 'keycodeInfo', titleKey: 'itTools.keycodeInfo', descKey: 'itTools.keycodeInfoDesc', category: 'web', icon: Globe, component: KeycodeInfo },
  { id: 'slugifyString', titleKey: 'itTools.slugifyString', descKey: 'itTools.slugifyStringDesc', category: 'web', icon: Globe, component: SlugifyString },
  { id: 'userAgentParser', titleKey: 'itTools.userAgentParser', descKey: 'itTools.userAgentParserDesc', category: 'web', icon: Globe, component: UserAgentParser },
  { id: 'jsonDiff', titleKey: 'itTools.jsonDiff', descKey: 'itTools.jsonDiffDesc', category: 'web', icon: Globe, component: JsonDiff },
  { id: 'safelinkDecoder', titleKey: 'itTools.safelinkDecoder', descKey: 'itTools.safelinkDecoderDesc', category: 'web', icon: Globe, component: SafelinkDecoder },
  { id: 'openGraphGenerator', titleKey: 'itTools.openGraphGenerator', descKey: 'itTools.openGraphGeneratorDesc', category: 'web', icon: Globe, component: OpenGraphGenerator },

  // Images
  { id: 'qrCodeGenerator', titleKey: 'itTools.qrCodeGenerator', descKey: 'itTools.qrCodeGeneratorDesc', category: 'images', icon: Image, component: QrCodeGenerator },
  { id: 'wifiQrGenerator', titleKey: 'itTools.wifiQrGenerator', descKey: 'itTools.wifiQrGeneratorDesc', category: 'images', icon: Image, component: WifiQrGenerator },
  { id: 'svgPlaceholder', titleKey: 'itTools.svgPlaceholder', descKey: 'itTools.svgPlaceholderDesc', category: 'images', icon: Image, component: SvgPlaceholder },
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
    { id: 'web', labelKey: 'itTools.web', icon: Globe },
    { id: 'images', labelKey: 'itTools.images', icon: Image },
    { id: 'text', labelKey: 'itTools.text', icon: Type },
    { id: 'development', labelKey: 'itTools.development', icon: Code },
  ];

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('itTools.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('itTools.subtitle')} ({tools.length} {t('itTools.tools')})</p>
        </div>

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
