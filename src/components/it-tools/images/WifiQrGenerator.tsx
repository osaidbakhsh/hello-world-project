import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Download, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

const WifiQrGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [encryption, setEncryption] = useState('WPA');
  const [hidden, setHidden] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateWifiString = (): string => {
    // WIFI:T:WPA;S:mynetwork;P:mypass;H:false;;
    const escapedSsid = ssid.replace(/[\\;,:]/g, '\\$&');
    const escapedPassword = password.replace(/[\\;,:]/g, '\\$&');
    return `WIFI:T:${encryption};S:${escapedSsid};P:${escapedPassword};H:${hidden};;`;
  };

  useEffect(() => {
    if (ssid && canvasRef.current) {
      const wifiString = generateWifiString();
      QRCode.toCanvas(canvasRef.current, wifiString, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) {
          console.error(error);
          return;
        }
        setQrDataUrl(canvasRef.current?.toDataURL() || '');
      });
    }
  }, [ssid, password, encryption, hidden]);

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `wifi-${ssid}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('itTools.networkName')} (SSID)</Label>
          <Input
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
            placeholder="MyWiFiNetwork"
          />
        </div>

        <div className="space-y-2">
          <Label>{t('itTools.password')}</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="space-y-2">
          <Label>{t('itTools.encryption')}</Label>
          <Select value={encryption} onValueChange={setEncryption}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WPA">WPA/WPA2/WPA3</SelectItem>
              <SelectItem value="WEP">WEP</SelectItem>
              <SelectItem value="nopass">{t('itTools.noPassword')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={hidden}
            onCheckedChange={setHidden}
          />
          <Label>{t('itTools.hiddenNetwork')}</Label>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="p-4 bg-white rounded-lg shadow-inner">
          <canvas ref={canvasRef} className={ssid ? '' : 'hidden'} />
          {!ssid && (
            <div className="w-64 h-64 flex items-center justify-center text-muted-foreground">
              <Wifi className="h-16 w-16" />
            </div>
          )}
        </div>
      </div>

      {ssid && (
        <Button onClick={downloadQr} className="w-full gap-2">
          <Download className="h-4 w-4" />
          {t('itTools.download')}
        </Button>
      )}

      <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
        <p>{t('itTools.wifiQrNote')}</p>
      </div>
    </div>
  );
};

export default WifiQrGenerator;
