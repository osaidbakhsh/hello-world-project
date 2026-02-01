import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Palette } from 'lucide-react';
import { toast } from 'sonner';

interface ColorValues {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
}

const ColorConverter: React.FC = () => {
  const { t } = useLanguage();
  const [color, setColor] = useState<ColorValues>({
    hex: '#3b82f6',
    rgb: { r: 59, g: 130, b: 246 },
    hsl: { h: 217, s: 91, l: 60 }
  });

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, x)).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  };

  const updateFromHex = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (rgb) {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setColor({ hex, rgb, hsl });
    }
  };

  const updateFromRgb = (r: number, g: number, b: number) => {
    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);
    setColor({ hex, rgb: { r, g, b }, hsl });
  };

  const updateFromHsl = (h: number, s: number, l: number) => {
    const rgb = hslToRgb(h, s, l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setColor({ hex, rgb, hsl: { h, s, l } });
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  const hexString = color.hex;
  const rgbString = `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
  const hslString = `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`;

  return (
    <div className="space-y-6">
      {/* Color Preview */}
      <div className="flex items-center gap-4">
        <div 
          className="w-24 h-24 rounded-lg border shadow-inner"
          style={{ backgroundColor: color.hex }}
        />
        <div className="flex-1">
          <input
            type="color"
            value={color.hex}
            onChange={(e) => updateFromHex(e.target.value)}
            className="w-full h-10 cursor-pointer"
          />
        </div>
      </div>

      {/* HEX */}
      <div className="space-y-2">
        <Label>HEX</Label>
        <div className="flex gap-2">
          <Input
            value={color.hex}
            onChange={(e) => updateFromHex(e.target.value)}
            placeholder="#000000"
            className="font-mono"
          />
          <Button variant="outline" size="icon" onClick={() => copyToClipboard(hexString)}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* RGB */}
      <div className="space-y-2">
        <Label>RGB</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">R</Label>
            <Input
              type="number"
              value={color.rgb.r}
              onChange={(e) => updateFromRgb(parseInt(e.target.value) || 0, color.rgb.g, color.rgb.b)}
              min={0}
              max={255}
            />
          </div>
          <div>
            <Label className="text-xs">G</Label>
            <Input
              type="number"
              value={color.rgb.g}
              onChange={(e) => updateFromRgb(color.rgb.r, parseInt(e.target.value) || 0, color.rgb.b)}
              min={0}
              max={255}
            />
          </div>
          <div>
            <Label className="text-xs">B</Label>
            <Input
              type="number"
              value={color.rgb.b}
              onChange={(e) => updateFromRgb(color.rgb.r, color.rgb.g, parseInt(e.target.value) || 0)}
              min={0}
              max={255}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Input value={rgbString} readOnly className="font-mono text-sm" />
          <Button variant="outline" size="icon" onClick={() => copyToClipboard(rgbString)}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* HSL */}
      <div className="space-y-2">
        <Label>HSL</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">H (°)</Label>
            <Input
              type="number"
              value={color.hsl.h}
              onChange={(e) => updateFromHsl(parseInt(e.target.value) || 0, color.hsl.s, color.hsl.l)}
              min={0}
              max={360}
            />
          </div>
          <div>
            <Label className="text-xs">S (%)</Label>
            <Input
              type="number"
              value={color.hsl.s}
              onChange={(e) => updateFromHsl(color.hsl.h, parseInt(e.target.value) || 0, color.hsl.l)}
              min={0}
              max={100}
            />
          </div>
          <div>
            <Label className="text-xs">L (%)</Label>
            <Input
              type="number"
              value={color.hsl.l}
              onChange={(e) => updateFromHsl(color.hsl.h, color.hsl.s, parseInt(e.target.value) || 0)}
              min={0}
              max={100}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Input value={hslString} readOnly className="font-mono text-sm" />
          <Button variant="outline" size="icon" onClick={() => copyToClipboard(hslString)}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ColorConverter;
