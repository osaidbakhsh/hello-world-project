import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';

type Permission = 'r' | 'w' | 'x';

const ChmodCalculator: React.FC = () => {
  const { t } = useLanguage();
  const [permissions, setPermissions] = useState({
    owner: { r: true, w: true, x: false },
    group: { r: true, w: false, x: false },
    others: { r: true, w: false, x: false },
  });
  const [octal, setOctal] = useState('644');
  const [symbolic, setSymbolic] = useState('-rw-r--r--');

  const calculateOctal = (perms: Record<Permission, boolean>) => {
    return (perms.r ? 4 : 0) + (perms.w ? 2 : 0) + (perms.x ? 1 : 0);
  };

  const calculateSymbolic = () => {
    const { owner, group, others } = permissions;
    const toSymbol = (p: Record<Permission, boolean>) =>
      (p.r ? 'r' : '-') + (p.w ? 'w' : '-') + (p.x ? 'x' : '-');
    return '-' + toSymbol(owner) + toSymbol(group) + toSymbol(others);
  };

  useEffect(() => {
    const { owner, group, others } = permissions;
    const oct = `${calculateOctal(owner)}${calculateOctal(group)}${calculateOctal(others)}`;
    setOctal(oct);
    setSymbolic(calculateSymbolic());
  }, [permissions]);

  const handleOctalChange = (value: string) => {
    setOctal(value);
    if (/^[0-7]{3}$/.test(value)) {
      const digits = value.split('').map(Number);
      const toPerms = (n: number): Record<Permission, boolean> => ({
        r: (n & 4) !== 0,
        w: (n & 2) !== 0,
        x: (n & 1) !== 0,
      });
      setPermissions({
        owner: toPerms(digits[0]),
        group: toPerms(digits[1]),
        others: toPerms(digits[2]),
      });
    }
  };

  const togglePermission = (category: 'owner' | 'group' | 'others', perm: Permission) => {
    setPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [perm]: !prev[category][perm],
      },
    }));
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  const categories = [
    { key: 'owner' as const, label: t('itTools.owner') },
    { key: 'group' as const, label: t('itTools.group') },
    { key: 'others' as const, label: t('itTools.others') },
  ];

  const permTypes: { key: Permission; label: string }[] = [
    { key: 'r', label: t('itTools.read') },
    { key: 'w', label: t('itTools.write') },
    { key: 'x', label: t('itTools.execute') },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {categories.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-4">
            <span className="w-20 text-sm font-medium">{label}</span>
            <div className="flex gap-4">
              {permTypes.map(({ key: perm, label: permLabel }) => (
                <div key={perm} className="flex items-center gap-2">
                  <Checkbox
                    id={`${key}-${perm}`}
                    checked={permissions[key][perm]}
                    onCheckedChange={() => togglePermission(key, perm)}
                  />
                  <Label htmlFor={`${key}-${perm}`} className="text-sm">
                    {permLabel} ({perm})
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm text-muted-foreground">{t('itTools.octalNotation')}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={octal}
                onChange={(e) => handleOctalChange(e.target.value)}
                className="font-mono text-xl font-bold text-center"
                maxLength={3}
              />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(octal)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Label className="text-sm text-muted-foreground">{t('itTools.symbolicNotation')}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={symbolic}
                readOnly
                className="font-mono text-xl font-bold text-center"
              />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(symbolic)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-3 rounded-lg bg-muted/50">
        <p className="font-mono text-sm">
          chmod {octal} filename
        </p>
      </div>
    </div>
  );
};

export default ChmodCalculator;
