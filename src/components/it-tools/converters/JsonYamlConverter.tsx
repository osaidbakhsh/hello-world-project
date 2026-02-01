import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

// Simple YAML parser/stringifier for basic cases
const jsonToYaml = (obj: any, indent = 0): string => {
  const spaces = '  '.repeat(indent);
  if (obj === null) return 'null';
  if (typeof obj === 'boolean') return obj.toString();
  if (typeof obj === 'number') return obj.toString();
  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes(':') || obj.includes('#')) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map(item => `${spaces}- ${jsonToYaml(item, indent + 1).trimStart()}`).join('\n');
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';
    return entries.map(([key, value]) => {
      const valueStr = jsonToYaml(value, indent + 1);
      if (typeof value === 'object' && value !== null && (Array.isArray(value) ? value.length : Object.keys(value).length)) {
        return `${spaces}${key}:\n${valueStr}`;
      }
      return `${spaces}${key}: ${valueStr}`;
    }).join('\n');
  }
  return String(obj);
};

const yamlToJson = (yaml: string): any => {
  // Simple YAML parser for basic structures
  const lines = yaml.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
  
  const parseValue = (value: string): any => {
    value = value.trim();
    if (value === 'null' || value === '~') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === '[]') return [];
    if (value === '{}') return {};
    if (/^-?\d+$/.test(value)) return parseInt(value);
    if (/^-?\d*\.\d+$/.test(value)) return parseFloat(value);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    return value;
  };

  // For now, just try JSON.parse if it looks like JSON
  try {
    return JSON.parse(yaml);
  } catch {
    // Basic YAML parsing - this is simplified
    const result: any = {};
    let currentKey = '';
    
    for (const line of lines) {
      const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
      if (match) {
        const [, , key, value] = match;
        if (value) {
          result[key.trim()] = parseValue(value);
        } else {
          currentKey = key.trim();
          result[currentKey] = {};
        }
      }
    }
    return result;
  }
};

const JsonYamlConverter: React.FC = () => {
  const { t } = useLanguage();
  const [jsonInput, setJsonInput] = useState('');
  const [yamlInput, setYamlInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [yamlOutput, setYamlOutput] = useState('');

  const convertToYaml = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setYamlOutput(jsonToYaml(parsed));
    } catch (error) {
      toast.error(t('itTools.invalidJson'));
    }
  };

  const convertToJson = () => {
    try {
      const parsed = yamlToJson(yamlInput);
      setJsonOutput(JSON.stringify(parsed, null, 2));
    } catch (error) {
      toast.error(t('itTools.invalidYaml'));
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  return (
    <Tabs defaultValue="json-to-yaml" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="json-to-yaml">JSON → YAML</TabsTrigger>
        <TabsTrigger value="yaml-to-json">YAML → JSON</TabsTrigger>
      </TabsList>

      <TabsContent value="json-to-yaml" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>JSON</Label>
          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"key": "value"}'
            rows={6}
            className="font-mono text-sm"
          />
        </div>

        <Button onClick={convertToYaml} className="w-full gap-2">
          <ArrowLeftRight className="h-4 w-4" />
          {t('itTools.convertToYaml')}
        </Button>

        {yamlOutput && (
          <div className="space-y-2">
            <Label>YAML</Label>
            <div className="flex gap-2">
              <Textarea
                value={yamlOutput}
                readOnly
                rows={6}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(yamlOutput)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="yaml-to-json" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>YAML</Label>
          <Textarea
            value={yamlInput}
            onChange={(e) => setYamlInput(e.target.value)}
            placeholder="key: value"
            rows={6}
            className="font-mono text-sm"
          />
        </div>

        <Button onClick={convertToJson} className="w-full gap-2">
          <ArrowLeftRight className="h-4 w-4" />
          {t('itTools.convertToJson')}
        </Button>

        {jsonOutput && (
          <div className="space-y-2">
            <Label>JSON</Label>
            <div className="flex gap-2">
              <Textarea
                value={jsonOutput}
                readOnly
                rows={6}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(jsonOutput)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default JsonYamlConverter;
