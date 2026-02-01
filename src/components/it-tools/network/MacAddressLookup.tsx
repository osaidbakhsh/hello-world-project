import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Building } from 'lucide-react';
import { toast } from 'sonner';

// Common OUI database (first 3 bytes of MAC address)
const ouiDatabase: Record<string, string> = {
  '00:00:0C': 'Cisco Systems',
  '00:00:5E': 'IANA',
  '00:01:42': 'Cisco Systems',
  '00:0C:29': 'VMware',
  '00:0C:6E': 'ASUSTek Computer',
  '00:0D:3A': 'Microsoft Corporation',
  '00:15:5D': 'Microsoft Hyper-V',
  '00:16:3E': 'Xen Virtual Machine',
  '00:1A:11': 'Google',
  '00:1C:42': 'Parallels',
  '00:1E:68': 'Quanta Computer',
  '00:21:5A': 'Hewlett Packard',
  '00:23:AE': 'Dell',
  '00:25:B5': 'Cisco Systems',
  '00:26:B9': 'Dell',
  '00:50:56': 'VMware',
  '00:E0:4C': 'Realtek Semiconductor',
  '08:00:27': 'Oracle VirtualBox',
  '0C:C4:7A': 'Super Micro Computer',
  '10:7B:EF': 'Zyxel Communications',
  '14:18:77': 'Dell',
  '18:66:DA': 'Dell',
  '1C:1B:0D': 'Galtronics',
  '24:6E:96': 'Dell',
  '28:6E:D4': 'Intel Corporate',
  '2C:30:33': 'Netgear',
  '34:17:EB': 'Dell',
  '38:D5:47': 'ASUSTek Computer',
  '3C:D9:2B': 'Hewlett Packard',
  '40:B0:34': 'Hewlett Packard',
  '44:38:39': 'Cumulus Networks',
  '48:65:EE': 'Cisco Systems',
  '4C:EB:42': 'Intel Corporate',
  '50:9A:4C': 'Dell',
  '54:AB:3A': 'Quanta Computer',
  '58:20:B1': 'Hewlett Packard',
  '5C:26:0A': 'Dell',
  '60:45:CB': 'ASUSTek Computer',
  '64:00:6A': 'Dell',
  '68:05:CA': 'Intel Corporate',
  '6C:2B:59': 'Dell',
  '70:10:6F': 'Hewlett Packard',
  '74:D4:35': 'Giga-Byte Technology',
  '78:2B:CB': 'Dell',
  '7C:D3:0A': 'Inventec Corporation',
  '80:18:44': 'Dell',
  '84:2B:2B': 'Dell',
  '88:51:FB': 'Hewlett Packard',
  '8C:EC:4B': 'Dell',
  '90:B1:1C': 'Dell',
  '94:57:A5': 'Hewlett Packard',
  '98:90:96': 'Dell',
  '9C:8E:99': 'Hewlett Packard',
  'A0:36:9F': 'Intel Corporate',
  'A4:1F:72': 'Dell',
  'A8:20:66': 'Intel Corporate',
  'AC:1F:6B': 'Super Micro Computer',
  'B0:83:FE': 'Dell',
  'B4:99:BA': 'Hewlett Packard',
  'B8:2A:72': 'Dell',
  'BC:30:5B': 'Dell',
  'C0:3F:D5': 'Elitegroup Computer',
  'C4:34:6B': 'Hewlett Packard',
  'C8:1F:66': 'Dell',
  'CC:48:3A': 'Dell',
  'D0:67:E5': 'Dell',
  'D4:AE:52': 'Dell',
  'D8:D3:85': 'Hewlett Packard',
  'DC:4A:3E': 'Hewlett Packard',
  'E0:DB:55': 'Dell',
  'E4:43:4B': 'Dell',
  'E8:EA:6A': 'Intel Corporate',
  'EC:F4:BB': 'Dell',
  'F0:1F:AF': 'Dell',
  'F4:8E:38': 'Dell',
  'F8:B1:56': 'Dell',
  'FC:15:B4': 'Hewlett Packard',
};

const MacAddressLookup: React.FC = () => {
  const { t } = useLanguage();
  const [macAddress, setMacAddress] = useState('');
  const [vendor, setVendor] = useState<string | null>(null);

  const normalizeMac = (mac: string): string => {
    // Remove all separators and convert to uppercase
    const cleaned = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    // Take first 6 characters (OUI)
    const oui = cleaned.substring(0, 6);
    // Format as XX:XX:XX
    return oui.match(/.{1,2}/g)?.join(':') || '';
  };

  const lookupVendor = () => {
    const normalizedOui = normalizeMac(macAddress);
    if (normalizedOui.length !== 8) {
      toast.error(t('itTools.invalidMac'));
      return;
    }

    const foundVendor = ouiDatabase[normalizedOui];
    setVendor(foundVendor || null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.macAddress')}</Label>
        <Input
          value={macAddress}
          onChange={(e) => setMacAddress(e.target.value)}
          placeholder="00:1A:2B:3C:4D:5E or 001A2B3C4D5E"
        />
        <p className="text-xs text-muted-foreground">
          {t('itTools.macFormats')}
        </p>
      </div>

      <Button onClick={lookupVendor} className="w-full gap-2">
        <Search className="h-4 w-4" />
        {t('itTools.lookup')}
      </Button>

      {vendor !== null && (
        <div className="p-4 bg-muted/50 rounded-lg">
          {vendor ? (
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{t('itTools.vendor')}</p>
                <p className="font-medium text-lg">{vendor}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center">
              {t('itTools.vendorNotFound')}
            </p>
          )}
        </div>
      )}

      <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
        <p>{t('itTools.ouiNote')}</p>
      </div>
    </div>
  );
};

export default MacAddressLookup;
