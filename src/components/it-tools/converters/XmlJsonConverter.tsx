import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const XmlJsonConverter: React.FC = () => {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'xmlToJson' | 'jsonToXml'>('xmlToJson');

  const xmlToJson = (xml: string): object => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    const parseNode = (node: Element): any => {
      const obj: any = {};
      
      // Attributes
      if (node.attributes.length > 0) {
        obj['@attributes'] = {};
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          obj['@attributes'][attr.name] = attr.value;
        }
      }
      
      // Children
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childElement = child as Element;
          const childObj = parseNode(childElement);
          if (obj[childElement.tagName]) {
            if (!Array.isArray(obj[childElement.tagName])) {
              obj[childElement.tagName] = [obj[childElement.tagName]];
            }
            obj[childElement.tagName].push(childObj);
          } else {
            obj[childElement.tagName] = childObj;
          }
        } else if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent?.trim();
          if (text) {
            if (Object.keys(obj).length === 0) {
              return text;
            }
            obj['#text'] = text;
          }
        }
      }
      
      return Object.keys(obj).length === 0 ? '' : obj;
    };
    
    const root = doc.documentElement;
    return { [root.tagName]: parseNode(root) };
  };

  const jsonToXml = (obj: any, rootName = 'root'): string => {
    const convert = (data: any, name: string): string => {
      if (data === null || data === undefined) {
        return `<${name}/>`;
      }
      
      if (typeof data !== 'object') {
        return `<${name}>${escapeXml(String(data))}</${name}>`;
      }
      
      if (Array.isArray(data)) {
        return data.map(item => convert(item, name)).join('\n');
      }
      
      let attrs = '';
      let children = '';
      
      for (const [key, value] of Object.entries(data)) {
        if (key === '@attributes') {
          for (const [attrName, attrValue] of Object.entries(value as object)) {
            attrs += ` ${attrName}="${escapeXml(String(attrValue))}"`;
          }
        } else if (key === '#text') {
          children += escapeXml(String(value));
        } else {
          children += convert(value, key);
        }
      }
      
      if (children) {
        return `<${name}${attrs}>${children}</${name}>`;
      }
      return `<${name}${attrs}/>`;
    };
    
    const escapeXml = (str: string): string => {
      return str.replace(/[<>&'"]/g, c => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case "'": return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };
    
    const keys = Object.keys(obj);
    if (keys.length === 1) {
      return convert(obj[keys[0]], keys[0]);
    }
    return convert(obj, rootName);
  };

  const formatXml = (xml: string): string => {
    let formatted = '';
    let indent = '';
    xml.split(/>\s*</).forEach(node => {
      if (node.match(/^\/\w/)) {
        indent = indent.substring(2);
      }
      formatted += indent + '<' + node + '>\n';
      if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith('?')) {
        indent += '  ';
      }
    });
    return formatted.substring(1, formatted.length - 2);
  };

  const convert = () => {
    try {
      if (mode === 'xmlToJson') {
        const json = xmlToJson(input);
        setOutput(JSON.stringify(json, null, 2));
      } else {
        const json = JSON.parse(input);
        const xml = jsonToXml(json);
        setOutput(formatXml(xml));
      }
    } catch (error) {
      toast.error(mode === 'xmlToJson' ? t('itTools.invalidXml') : t('itTools.invalidJson'));
    }
  };

  const copyToClipboard = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={mode === 'xmlToJson' ? 'default' : 'outline'}
          onClick={() => { setMode('xmlToJson'); setOutput(''); }}
          className="flex-1"
        >
          XML → JSON
        </Button>
        <Button
          variant={mode === 'jsonToXml' ? 'default' : 'outline'}
          onClick={() => { setMode('jsonToXml'); setOutput(''); }}
          className="flex-1"
        >
          JSON → XML
        </Button>
      </div>

      <div className="space-y-2">
        <Label>{mode === 'xmlToJson' ? 'XML' : 'JSON'}</Label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'xmlToJson' ? '<root><item>value</item></root>' : '{"root": {"item": "value"}}'}
          rows={6}
          className="font-mono text-sm"
        />
      </div>

      <Button onClick={convert} className="w-full gap-2">
        <ArrowRight className="h-4 w-4" />
        {t('itTools.convert')}
      </Button>

      {output && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{mode === 'xmlToJson' ? 'JSON' : 'XML'}</Label>
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={output}
            readOnly
            rows={8}
            className="font-mono text-sm"
          />
        </div>
      )}
    </div>
  );
};

export default XmlJsonConverter;
