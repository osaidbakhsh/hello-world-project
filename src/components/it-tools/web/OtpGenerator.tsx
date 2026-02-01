import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Copy, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';

const OtpGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [secret, setSecret] = useState('');
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [digits, setDigits] = useState(6);

  // Simple TOTP implementation
  const generateOtp = async (secretKey: string): Promise<string> => {
    if (!secretKey) return '';
    
    // For demo, generate a random OTP based on time and secret
    const time = Math.floor(Date.now() / 1000 / 30);
    const encoder = new TextEncoder();
    const data = encoder.encode(secretKey + time);
    
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = new Uint8Array(hashBuffer);
    
    // Dynamic truncation
    const offset = hashArray[hashArray.length - 1] & 0x0f;
    const binary = ((hashArray[offset] & 0x7f) << 24) |
                   ((hashArray[offset + 1] & 0xff) << 16) |
                   ((hashArray[offset + 2] & 0xff) << 8) |
                   (hashArray[offset + 3] & 0xff);
    
    const otpValue = binary % Math.pow(10, digits);
    return otpValue.toString().padStart(digits, '0');
  };

  const refreshOtp = async () => {
    if (secret) {
      const newOtp = await generateOtp(secret);
      setOtp(newOtp);
    }
  };

  useEffect(() => {
    refreshOtp();
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setTimeLeft(remaining);
      if (remaining === 30) {
        refreshOtp();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [secret, digits]);

  const generateRandomSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSecret(result);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t('itTools.secretKey')} (Base32)</Label>
        <div className="flex gap-2">
          <Input
            value={secret}
            onChange={(e) => setSecret(e.target.value.toUpperCase().replace(/[^A-Z2-7]/g, ''))}
            placeholder="JBSWY3DPEHPK3PXP"
            className="font-mono"
          />
          <Button variant="outline" onClick={generateRandomSecret}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('itTools.digits')}: {digits}</Label>
        <Slider
          value={[digits]}
          onValueChange={(v) => setDigits(v[0])}
          min={6}
          max={8}
          step={1}
        />
      </div>

      {secret && (
        <div className="space-y-4">
          <div className="p-6 bg-muted/50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t('itTools.expiresIn')}: {timeLeft}s
              </span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <span className="text-4xl font-mono font-bold tracking-widest">
                {otp}
              </span>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(otp)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
        <p>{t('itTools.otpNote')}</p>
      </div>
    </div>
  );
};

export default OtpGenerator;
