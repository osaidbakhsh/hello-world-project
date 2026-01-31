import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Lock, Upload, Info, Loader2, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';

interface CertificateInfo {
  filename: string;
  uploadedAt: string;
  type: 'pfx' | 'pem';
}

const HTTPSSettingsTab: React.FC = () => {
  const { t, dir } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const { getSetting, updateSetting } = useAppSettings();
  const { toast } = useToast();
  
  const [isUploading, setIsUploading] = useState(false);
  const [certificateInfo, setCertificateInfo] = useState<CertificateInfo | null>(null);
  const [pfxPassword, setPfxPassword] = useState('');
  
  const pfxInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  // Load current certificate info
  useEffect(() => {
    const loadCertInfo = async () => {
      const certInfo = await getSetting('certificate_info');
      if (certInfo) {
        try {
          setCertificateInfo(JSON.parse(certInfo));
        } catch (e) {
          console.error('Failed to parse certificate info');
        }
      }
    };
    loadCertInfo();
  }, [getSetting]);

  const handlePFXUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!pfxPassword) {
      toast({
        title: t('common.error'),
        description: dir === 'rtl' ? 'يرجى إدخال كلمة مرور PFX' : 'Please enter PFX password',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const timestamp = Date.now();
      const filename = `cert_${timestamp}.pfx`;
      
      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Store certificate metadata (NOT the password!)
      const certInfo: CertificateInfo = {
        filename,
        uploadedAt: new Date().toISOString(),
        type: 'pfx',
      };
      
      await updateSetting('certificate_info', JSON.stringify(certInfo));
      setCertificateInfo(certInfo);

      // Log to audit (without password)
      await supabase.from('audit_logs').insert({
        user_id: profile?.id,
        user_name: profile?.full_name,
        user_email: profile?.email,
        action: 'create',
        table_name: 'certificates',
        entity_name: 'SSL Certificate (PFX)',
        new_data: { filename, type: 'pfx' },
      });

      toast({
        title: t('common.success'),
        description: dir === 'rtl' ? 'تم رفع الشهادة بنجاح' : 'Certificate uploaded successfully',
      });

    } catch (error) {
      console.error('Certificate upload error:', error);
      toast({
        title: t('common.error'),
        description: dir === 'rtl' ? 'فشل في رفع الشهادة' : 'Failed to upload certificate',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (pfxInputRef.current) pfxInputRef.current.value = '';
      setPfxPassword('');
    }
  };

  const handlePEMUpload = async () => {
    const certFile = certInputRef.current?.files?.[0];
    const keyFile = keyInputRef.current?.files?.[0];

    if (!certFile || !keyFile) {
      toast({
        title: t('common.error'),
        description: dir === 'rtl' ? 'يرجى اختيار ملفي الشهادة والمفتاح' : 'Please select both certificate and key files',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const timestamp = Date.now();
      const certFilename = `cert_${timestamp}.pem`;
      const keyFilename = `key_${timestamp}.pem`;

      // Upload certificate
      const { error: certError } = await supabase.storage
        .from('certificates')
        .upload(certFilename, certFile, { cacheControl: '3600', upsert: true });
      
      if (certError) throw certError;

      // Upload key
      const { error: keyError } = await supabase.storage
        .from('certificates')
        .upload(keyFilename, keyFile, { cacheControl: '3600', upsert: true });
      
      if (keyError) throw keyError;

      // Store certificate metadata
      const certInfo: CertificateInfo = {
        filename: certFilename,
        uploadedAt: new Date().toISOString(),
        type: 'pem',
      };
      
      await updateSetting('certificate_info', JSON.stringify(certInfo));
      setCertificateInfo(certInfo);

      // Log to audit
      await supabase.from('audit_logs').insert({
        user_id: profile?.id,
        user_name: profile?.full_name,
        user_email: profile?.email,
        action: 'create',
        table_name: 'certificates',
        entity_name: 'SSL Certificate (PEM)',
        new_data: { certFilename, keyFilename, type: 'pem' },
      });

      toast({
        title: t('common.success'),
        description: dir === 'rtl' ? 'تم رفع الشهادة بنجاح' : 'Certificate uploaded successfully',
      });

    } catch (error) {
      console.error('Certificate upload error:', error);
      toast({
        title: t('common.error'),
        description: dir === 'rtl' ? 'فشل في رفع الشهادة' : 'Failed to upload certificate',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (certInputRef.current) certInputRef.current.value = '';
      if (keyInputRef.current) keyInputRef.current.value = '';
    }
  };

  const handleRemoveCertificate = async () => {
    if (!certificateInfo) return;
    
    const confirm = window.confirm(
      dir === 'rtl' ? 'هل أنت متأكد من حذف الشهادة؟' : 'Are you sure you want to remove the certificate?'
    );
    if (!confirm) return;

    try {
      // Delete from storage
      await supabase.storage.from('certificates').remove([certificateInfo.filename]);
      
      // Remove metadata
      await updateSetting('certificate_info', '');
      setCertificateInfo(null);

      // Log to audit
      await supabase.from('audit_logs').insert({
        user_id: profile?.id,
        user_name: profile?.full_name,
        user_email: profile?.email,
        action: 'delete',
        table_name: 'certificates',
        entity_name: 'SSL Certificate',
      });

      toast({
        title: t('common.success'),
        description: dir === 'rtl' ? 'تم حذف الشهادة' : 'Certificate removed',
      });

    } catch (error) {
      toast({
        title: t('common.error'),
        description: dir === 'rtl' ? 'فشل في حذف الشهادة' : 'Failed to remove certificate',
        variant: 'destructive',
      });
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {dir === 'rtl' ? 'هذه الإعدادات متاحة للمسؤولين فقط' : 'These settings are available to administrators only'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          {dir === 'rtl' ? 'شهادات HTTPS / SSL' : 'HTTPS / SSL Certificates'}
        </CardTitle>
        <CardDescription>
          {dir === 'rtl' 
            ? 'رفع شهادات SSL لتفعيل HTTPS في بيئة Docker ذاتية الاستضافة'
            : 'Upload SSL certificates to enable HTTPS for self-hosted Docker deployment'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Certificate Status */}
        {certificateInfo && (
          <div className="p-4 border rounded-lg bg-success/10 border-success/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <div>
                  <p className="font-medium">
                    {dir === 'rtl' ? 'الشهادة الحالية' : 'Current Certificate'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {certificateInfo.type.toUpperCase()} - {new Date(certificateInfo.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleRemoveCertificate}>
                <Trash2 className="w-4 h-4 me-1" />
                {dir === 'rtl' ? 'حذف' : 'Remove'}
              </Button>
            </div>
          </div>
        )}

        {!certificateInfo && (
          <div className="p-4 border rounded-lg bg-warning/10 border-warning/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <p className="text-sm">
                {dir === 'rtl' ? 'لم يتم رفع شهادة بعد' : 'No certificate uploaded yet'}
              </p>
            </div>
          </div>
        )}

        {/* PFX Option */}
        <div className="p-4 border rounded-lg space-y-4">
          <h4 className="font-medium">{dir === 'rtl' ? 'الخيار أ: ملف PFX' : 'Option A: PFX File'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{dir === 'rtl' ? 'ملف PFX' : 'PFX File'}</Label>
              <Input 
                ref={pfxInputRef}
                type="file" 
                accept=".pfx,.p12" 
              />
            </div>
            <div className="space-y-2">
              <Label>{dir === 'rtl' ? 'كلمة مرور PFX' : 'PFX Password'}</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={pfxPassword}
                onChange={(e) => setPfxPassword(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={() => pfxInputRef.current?.files?.[0] && handlePFXUpload({ target: pfxInputRef.current } as any)}
            disabled={isUploading || !pfxPassword}
            className="gap-2"
          >
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Upload className="w-4 h-4" />
            {dir === 'rtl' ? 'رفع PFX' : 'Upload PFX'}
          </Button>
        </div>

        {/* PEM Option */}
        <div className="p-4 border rounded-lg space-y-4">
          <h4 className="font-medium">{dir === 'rtl' ? 'الخيار ب: ملفات PEM' : 'Option B: PEM Files'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{dir === 'rtl' ? 'ملف الشهادة (cert.pem)' : 'Certificate File (cert.pem)'}</Label>
              <Input 
                ref={certInputRef}
                type="file" 
                accept=".pem,.crt" 
              />
            </div>
            <div className="space-y-2">
              <Label>{dir === 'rtl' ? 'ملف المفتاح (key.pem)' : 'Key File (key.pem)'}</Label>
              <Input 
                ref={keyInputRef}
                type="file" 
                accept=".pem,.key" 
              />
            </div>
          </div>
          <Button 
            onClick={handlePEMUpload}
            disabled={isUploading}
            className="gap-2"
          >
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Upload className="w-4 h-4" />
            {dir === 'rtl' ? 'رفع PEM' : 'Upload PEM'}
          </Button>
        </div>

        {/* Docker Guidance */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Info className="w-4 h-4" />
            {dir === 'rtl' ? 'تعليمات Docker' : 'Docker Deployment Instructions'}
          </h4>
          <p className="text-sm text-muted-foreground">
            {dir === 'rtl' 
              ? 'لتفعيل HTTPS في بيئة Docker، استخدم Nginx أو Traefik كـ Reverse Proxy:'
              : 'To enable HTTPS in Docker, use Nginx or Traefik as a reverse proxy:'}
          </p>
          
          <div className="space-y-2">
            <Badge variant="outline">Nginx</Badge>
            <pre className="text-xs bg-background p-3 rounded border overflow-x-auto" dir="ltr">
{`# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./certs:/etc/nginx/certs:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro

# nginx.conf
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}`}
            </pre>
          </div>

          <div className="space-y-2">
            <Badge variant="outline">Traefik</Badge>
            <pre className="text-xs bg-background p-3 rounded border overflow-x-auto" dir="ltr">
{`# docker-compose.yml
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--entrypoints.websecure.address=:443"
      - "--providers.file.filename=/etc/traefik/certs.toml"
    ports:
      - "443:443"
    volumes:
      - ./certs:/certs:ro
      - ./certs.toml:/etc/traefik/certs.toml:ro`}
            </pre>
          </div>

          <div className="p-3 bg-warning/10 border border-warning/20 rounded text-sm">
            <strong>{dir === 'rtl' ? 'تحذير أمني:' : 'Security Warning:'}</strong>
            <p className="text-muted-foreground mt-1">
              {dir === 'rtl' 
                ? 'لا تشارك ملفات المفاتيح الخاصة. الشهادات المرفوعة هنا متاحة فقط للمسؤولين ولا يتم عرضها للموظفين.'
                : 'Never share private key files. Certificates uploaded here are only accessible to administrators and are not exposed to employees.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HTTPSSettingsTab;
