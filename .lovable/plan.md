
# خطة تنفيذ شاملة: إزالة التسجيل الذاتي + إعادة تعيين كلمة المرور + بيانات تجريبية احترافية + CSR Tool

## نظرة عامة

هذه الخطة تتضمن 5 أجزاء رئيسية:
1. **إزالة التسجيل الذاتي** - حذف صفحة /register وتحويلها
2. **إعادة تعيين كلمة المرور** - إضافة "نسيت كلمة المرور" وصفحة تعيين كلمة مرور جديدة
3. **بيانات تجريبية احترافية** - إعادة كتابة seedData.ts بالكامل
4. **تحسين واجهة تسجيل الدخول** - تحديث الألوان والعلامة التجارية
5. **أداة CSR Generator** - إضافة أداة إنشاء طلب شهادة SSL

---

## الجزء الأول: إزالة التسجيل الذاتي

### الملفات المتأثرة

| الملف | الإجراء |
|-------|---------|
| `src/pages/Register.tsx` | حذف الملف |
| `src/App.tsx` | إزالة route /register، إضافة redirect أو 404 |
| `src/pages/Login.tsx` | التأكد من عدم وجود رابط للتسجيل (موجود بالفعل) |

### التغييرات المطلوبة

```typescript
// App.tsx - تغيير route /register
// من:
<Route path="/register" element={<Register />} />

// إلى:
<Route path="/register" element={<Navigate to="/login" replace />} />
```

---

## الجزء الثاني: إعادة تعيين كلمة المرور

### الملفات الجديدة

| الملف | الوصف |
|-------|-------|
| `src/pages/ResetPassword.tsx` | صفحة تعيين كلمة المرور الجديدة (بعد الضغط على الرابط في البريد) |
| `src/pages/ForgotPassword.tsx` | صفحة إدخال البريد لطلب إعادة التعيين (اختياري - يمكن دمجها في Login) |

### التغييرات في Login.tsx

```typescript
// إضافة رابط "نسيت كلمة المرور؟"
const [showForgotPassword, setShowForgotPassword] = useState(false);
const [forgotEmail, setForgotEmail] = useState('');
const [isSendingReset, setIsSendingReset] = useState(false);

const handleForgotPassword = async () => {
  setIsSendingReset(true);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    // لا نكشف إذا كان البريد موجوداً أم لا (أمان)
    toast({
      title: t('auth.resetEmailSent'),
      description: t('auth.resetEmailSentDesc'),
    });
    setShowForgotPassword(false);
  } catch (error) {
    // نفس الرسالة للأمان
    toast({
      title: t('auth.resetEmailSent'),
      description: t('auth.resetEmailSentDesc'),
    });
  }
  setIsSendingReset(false);
};
```

### صفحة ResetPassword.tsx

```typescript
// الحصول على recovery token من URL
// استخدام supabase.auth.updateUser لتحديث كلمة المرور
// التحقق من وجود session بعد الضغط على الرابط

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Supabase يضع الـ session تلقائياً عند فتح رابط إعادة التعيين
  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.passwordMismatch'));
      return;
    }
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      toast.error(t('auth.resetFailed'));
    } else {
      toast.success(t('auth.passwordChanged'));
      navigate('/login');
    }
  };
};
```

### تحذير SMTP

```typescript
// إذا لم يتم تكوين SMTP - إظهار تحذير
// نستخدم إعدادات mail_settings من قاعدة البيانات

{!smtpConfigured && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      {t('auth.smtpNotConfigured')}
    </AlertDescription>
  </Alert>
)}
```

### الترجمات المطلوبة

```typescript
// Arabic
'auth.forgotPassword': 'نسيت كلمة المرور؟',
'auth.resetPassword': 'إعادة تعيين كلمة المرور',
'auth.enterEmailForReset': 'أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور',
'auth.sendResetLink': 'إرسال رابط إعادة التعيين',
'auth.sending': 'جاري الإرسال...',
'auth.resetEmailSent': 'تم إرسال الرابط',
'auth.resetEmailSentDesc': 'إذا كان البريد مسجلاً، ستصلك رسالة لإعادة تعيين كلمة المرور',
'auth.newPassword': 'كلمة المرور الجديدة',
'auth.confirmNewPassword': 'تأكيد كلمة المرور الجديدة',
'auth.setNewPassword': 'تعيين كلمة المرور الجديدة',
'auth.passwordMismatch': 'كلمات المرور غير متطابقة',
'auth.passwordChanged': 'تم تغيير كلمة المرور بنجاح',
'auth.resetFailed': 'فشل في إعادة تعيين كلمة المرور',
'auth.backToLogin': 'العودة لتسجيل الدخول',
'auth.smtpNotConfigured': 'تنبيه: لم يتم تكوين خادم البريد. تواصل مع المسؤول.',
'auth.tokenExpired': 'انتهت صلاحية رابط إعادة التعيين',
'auth.invalidToken': 'رابط إعادة التعيين غير صالح',

// English
'auth.forgotPassword': 'Forgot password?',
'auth.resetPassword': 'Reset Password',
'auth.enterEmailForReset': 'Enter your email to reset your password',
'auth.sendResetLink': 'Send Reset Link',
'auth.sending': 'Sending...',
'auth.resetEmailSent': 'Reset Link Sent',
'auth.resetEmailSentDesc': 'If the email is registered, you will receive a password reset link',
'auth.newPassword': 'New Password',
'auth.confirmNewPassword': 'Confirm New Password',
'auth.setNewPassword': 'Set New Password',
'auth.passwordMismatch': 'Passwords do not match',
'auth.passwordChanged': 'Password changed successfully',
'auth.resetFailed': 'Failed to reset password',
'auth.backToLogin': 'Back to Login',
'auth.smtpNotConfigured': 'Warning: Email server not configured. Contact administrator.',
'auth.tokenExpired': 'Reset link has expired',
'auth.invalidToken': 'Invalid reset link',
```

---

## الجزء الثالث: بيانات تجريبية احترافية

### إعادة كتابة seedData.ts

```typescript
// النطاقات الثلاثة المطلوبة
const professionalDomains = [
  { name: 'os.com', description: 'Operations & Systems Domain' },
  { name: 'at.com', description: 'Applications & Technology Domain' },
  { name: 'is.com', description: 'Infrastructure & Security Domain' },
];

// 5 موظفين إضافيين مع أدوار واقعية
const professionalEmployees = [
  { 
    full_name: 'Mohammed Al-Rashid', 
    email: 'mohammed.rashid@company.com',
    department: 'IT Operations',
    position: 'IT Operations Manager',
    skills: ['Windows Server', 'VMware', 'Backup Management'],
    // يرى: os.com, at.com
  },
  { 
    full_name: 'Sarah Ahmed', 
    email: 'sarah.ahmed@company.com',
    department: 'Network',
    position: 'Senior Network Engineer',
    skills: ['Cisco', 'Firewall', 'VPN', 'SD-WAN'],
    // يرى: is.com فقط
  },
  { 
    full_name: 'Omar Hassan', 
    email: 'omar.hassan@company.com',
    department: 'Helpdesk',
    position: 'Helpdesk Team Lead',
    skills: ['ITIL', 'ServiceNow', 'Active Directory'],
    // يرى: os.com فقط
  },
  { 
    full_name: 'Fatima Al-Sayed', 
    email: 'fatima.sayed@company.com',
    department: 'Security',
    position: 'Security Analyst',
    skills: ['SIEM', 'Penetration Testing', 'Compliance'],
    // يرى: is.com فقط
  },
  { 
    full_name: 'Khalid Ibrahim', 
    email: 'khalid.ibrahim@company.com',
    department: 'Management',
    position: 'IT Director',
    // يرى: جميع النطاقات (admin)
  },
];

// الشبكات - 2 لكل نطاق
const professionalNetworks = [
  // os.com
  { domain: 'os.com', name: 'OS-PROD-NET', subnet: '10.10.1.0/24', gateway: '10.10.1.1' },
  { domain: 'os.com', name: 'OS-MGMT-NET', subnet: '10.10.2.0/24', gateway: '10.10.2.1' },
  // at.com
  { domain: 'at.com', name: 'AT-APP-NET', subnet: '10.20.1.0/24', gateway: '10.20.1.1' },
  { domain: 'at.com', name: 'AT-DEV-NET', subnet: '10.20.2.0/24', gateway: '10.20.2.1' },
  // is.com
  { domain: 'is.com', name: 'IS-SEC-NET', subnet: '10.30.1.0/24', gateway: '10.30.1.1' },
  { domain: 'is.com', name: 'IS-DMZ-NET', subnet: '10.30.100.0/24', gateway: '10.30.100.1' },
];

// السيرفرات - 6-10 لكل نطاق مع أدوار حرجة
const professionalServers = [
  // os.com (8 سيرفرات)
  { 
    name: 'OS-DC01', 
    ip_address: '10.10.1.10', 
    server_role: ['DC', 'DNS', 'DHCP'],
    primary_application: 'Active Directory',
    operating_system: 'Windows Server 2022',
    environment: 'production',
    is_backed_up_by_veeam: true,
    backup_frequency: 'daily',
    vendor: 'Dell',
    model: 'PowerEdge R750',
    serial_number: 'DELL-OS-DC01-2024',
    purchase_date: '2023-01-15',
    warranty_end: '2028-01-15',
    eol_date: '2030-10-14',
    eos_date: '2032-10-13',
  },
  { 
    name: 'OS-DC02', 
    ip_address: '10.10.1.11', 
    server_role: ['DC', 'DNS'],
    primary_application: 'Active Directory',
    is_backed_up_by_veeam: true,
    backup_frequency: 'daily',
    // ... similar fields
  },
  { 
    name: 'OS-CA01', 
    ip_address: '10.10.1.20', 
    server_role: ['CA'],
    primary_application: 'Certificate Authority',
    is_backed_up_by_veeam: true,
  },
  { 
    name: 'OS-FILE01', 
    ip_address: '10.10.1.30', 
    server_role: ['File'],
    primary_application: 'File Server',
  },
  { 
    name: 'OS-PRINT01', 
    ip_address: '10.10.1.31', 
    server_role: ['Print'],
    primary_application: 'Print Server',
  },
  { 
    name: 'OS-BACKUP01', 
    ip_address: '10.10.2.10', 
    server_role: ['Backup'],
    primary_application: 'Veeam Backup Server',
    is_backed_up_by_veeam: true,
  },
  // at.com (7 سيرفرات)
  { 
    name: 'AT-EXCH01', 
    server_role: ['Exchange'],
    primary_application: 'Exchange 2019',
  },
  { 
    name: 'AT-APP01', 
    server_role: ['IIS'],
    primary_application: 'IIS Web Applications',
  },
  { 
    name: 'AT-SQL01', 
    server_role: ['SQL'],
    primary_application: 'SQL Server 2022',
  },
  { 
    name: 'AT-GITLAB01', 
    primary_application: 'GitLab CE',
  },
  { 
    name: 'AT-JENKINS01', 
    primary_application: 'Jenkins CI/CD',
  },
  // is.com (6 سيرفرات)
  { 
    name: 'IS-SIEM01', 
    primary_application: 'SIEM/Log Management',
  },
  { 
    name: 'IS-MONITOR01', 
    primary_application: 'Zabbix Monitoring',
  },
  { 
    name: 'IS-FW-MGMT01', 
    primary_application: 'Firewall Management',
  },
  // ... المزيد
];

// التراخيص مع تواريخ انتهاء متنوعة
const professionalLicenses = [
  // منتهية
  { 
    name: 'Adobe Acrobat Pro', 
    vendor: 'Adobe', 
    expiry_date: '2025-12-01', // منتهية
    status: 'expired',
  },
  // قريبة الانتهاء (30 يوم)
  { 
    name: 'Kaspersky Endpoint Security', 
    vendor: 'Kaspersky', 
    expiry_date: '2026-02-15', // قريبة
  },
  { 
    name: 'VMware vSphere Enterprise', 
    vendor: 'VMware', 
    expiry_date: '2026-02-20', // قريبة
  },
  // صالحة
  { 
    name: 'Microsoft 365 E3', 
    vendor: 'Microsoft', 
    expiry_date: '2027-06-30',
  },
  { 
    name: 'Windows Server 2022 Datacenter', 
    vendor: 'Microsoft', 
    expiry_date: '2028-01-01',
  },
  // ... المزيد
];

// المهام موزعة على الموظفين والنطاقات
const professionalTasks = [
  // متأخرة
  { 
    title: 'تجديد شهادة SSL لبوابة الموظفين',
    description: 'تجديد شهادة SSL قبل انتهائها',
    priority: 'p1',
    due_date: '2026-01-15', // متأخرة
    task_status: 'todo',
    // مرتبطة بسيرفر AT-APP01
  },
  // قيد التنفيذ
  { 
    title: 'ترقية VMware vSphere إلى 8.0',
    description: 'ترقية منصة الافتراضية',
    priority: 'p2',
    task_status: 'in_progress',
  },
  // مكتملة
  { 
    title: 'تكوين النسخ الاحتياطي للسيرفرات الجديدة',
    task_status: 'done',
  },
  // ... المزيد
];

// تطبيقات الويب
const professionalWebApps = [
  { 
    name: 'Active Directory Admin Center', 
    url: 'https://adac.os.com',
    category: 'infrastructure',
    tags: ['AD', 'Identity', 'Core'],
  },
  { 
    name: 'GitLab', 
    url: 'https://gitlab.at.com',
    category: 'development',
    tags: ['Git', 'DevOps', 'CI/CD'],
  },
  { 
    name: 'Grafana', 
    url: 'https://grafana.is.com',
    category: 'monitoring',
    tags: ['Metrics', 'Dashboard', 'Alerts'],
  },
  { 
    name: 'Jenkins', 
    url: 'https://jenkins.at.com',
    category: 'development',
    tags: ['CI/CD', 'Automation', 'Build'],
  },
  { 
    name: 'Zabbix', 
    url: 'https://zabbix.is.com',
    category: 'monitoring',
    tags: ['Infrastructure', 'Alerts', 'SNMP'],
  },
  { 
    name: 'Veeam Backup Console', 
    url: 'https://backup.os.com',
    category: 'backup',
    tags: ['Backup', 'Recovery', 'DR'],
  },
  { 
    name: 'Confluence Wiki', 
    url: 'https://wiki.at.com',
    category: 'documentation',
    tags: ['Wiki', 'Knowledge Base', 'Docs'],
  },
];
```

### نقاط مهمة في seedData.ts

1. **حذف البيانات القديمة ولكن الإبقاء على الموظفين/profiles**
2. **تعيين صلاحيات النطاقات للموظفين الجدد عبر domain_memberships**
3. **التأكد من أن Critical Roles Card يظهر السيرفرات عبر server_role array**

---

## الجزء الرابع: تحسين واجهة تسجيل الدخول

### Login.tsx - تحديث التصميم

```typescript
// تغيير العنوان ليكون:
// "IT" = accent color (gold)
// "Infrastructure" = primary color (teal)

<CardTitle className="text-2xl font-bold">
  <span className="text-accent">IT</span>{' '}
  <span className="text-primary">Infrastructure</span>
</CardTitle>

// تحسين البطاقة لتكون أقل بياضاً
<Card className="w-full max-w-md shadow-2xl relative z-10 
  border-primary/30 bg-card/90 backdrop-blur-lg">
```

### Sidebar.tsx - تحديث العنوان

```typescript
// نفس النمط
<span className="font-bold text-lg text-sidebar-foreground whitespace-nowrap">
  <span className="text-accent">IT</span>{' '}
  <span className="text-primary">Infrastructure</span>
</span>
```

---

## الجزء الخامس: أداة CSR Generator

### ملف جديد: src/components/it-tools/crypto/CsrGenerator.tsx

```typescript
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Copy, Download, FileKey, Terminal, AlertTriangle, 
  CheckCircle2, Plus, X, Shield 
} from 'lucide-react';
import { toast } from 'sonner';

interface SAN {
  type: 'DNS' | 'IP';
  value: string;
}

const CsrGenerator: React.FC = () => {
  const { t } = useLanguage();
  
  // Form State
  const [cn, setCn] = useState('');
  const [sans, setSans] = useState<SAN[]>([]);
  const [organization, setOrganization] = useState('');
  const [organizationalUnit, setOrganizationalUnit] = useState('');
  const [country, setCountry] = useState('SA');
  const [state, setState] = useState('');
  const [locality, setLocality] = useState('');
  const [keySize, setKeySize] = useState('2048');
  const [algorithm, setAlgorithm] = useState('RSA');
  
  // Generated outputs
  const [opensslCommand, setOpensslCommand] = useState('');
  const [opensslConfig, setOpensslConfig] = useState('');
  const [generatedCsr, setGeneratedCsr] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  
  const addSan = () => {
    setSans([...sans, { type: 'DNS', value: '' }]);
  };
  
  const removeSan = (index: number) => {
    setSans(sans.filter((_, i) => i !== index));
  };
  
  const updateSan = (index: number, field: keyof SAN, value: string) => {
    const newSans = [...sans];
    newSans[index] = { ...newSans[index], [field]: value };
    setSans(newSans);
  };
  
  const generateOpensslConfig = () => {
    const sanEntries = sans.map((san, i) => 
      `${san.type}.${i + 1} = ${san.value}`
    ).join('\n');
    
    return `# OpenSSL CSR Configuration
# Generated by IT Infrastructure Manager

[req]
default_bits = ${keySize}
default_keyfile = ${cn.replace(/\./g, '_')}.key
distinguished_name = req_distinguished_name
req_extensions = req_ext
prompt = no

[req_distinguished_name]
C = ${country}
${state ? `ST = ${state}` : ''}
${locality ? `L = ${locality}` : ''}
O = ${organization}
${organizationalUnit ? `OU = ${organizationalUnit}` : ''}
CN = ${cn}

[req_ext]
subjectAltName = @alt_names
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth

[alt_names]
DNS.1 = ${cn}
${sanEntries}
`;
  };
  
  const generateOpensslCommand = () => {
    const keyFile = `${cn.replace(/\./g, '_')}.key`;
    const csrFile = `${cn.replace(/\./g, '_')}.csr`;
    const configFile = `${cn.replace(/\./g, '_')}.cnf`;
    
    return `# Step 1: Save the configuration file as "${configFile}"

# Step 2: Generate private key and CSR
openssl req -new -newkey rsa:${keySize} -nodes \\
  -keyout ${keyFile} \\
  -out ${csrFile} \\
  -config ${configFile}

# Step 3: Verify the CSR
openssl req -text -noout -verify -in ${csrFile}

# Step 4: View the CSR content
openssl req -in ${csrFile} -text -noout`;
  };
  
  const handleGenerate = () => {
    if (!cn) {
      toast.error(t('itTools.csrCnRequired'));
      return;
    }
    
    setOpensslConfig(generateOpensslConfig());
    setOpensslCommand(generateOpensslCommand());
    toast.success(t('itTools.csrGenerated'));
  };
  
  // Client-side CSR generation using WebCrypto
  const generateClientSide = async () => {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSASSA-PKCS1-v1_5',
          modulusLength: parseInt(keySize),
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true,
        ['sign', 'verify']
      );
      
      // Export private key
      const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateKeyBase64 = arrayBufferToBase64(privateKeyBuffer);
      setGeneratedKey(formatPem(privateKeyBase64, 'PRIVATE'));
      
      toast.success(t('itTools.keyGenerated'));
      toast.warning(t('itTools.csrNeedsOpenssl'));
    } catch (error) {
      toast.error(t('common.error'));
    }
  };
  
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t('common.copied'));
  };
  
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('itTools.fileDownloaded'));
  };
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="generate">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="gap-2">
            <Terminal className="h-4 w-4" />
            {t('itTools.csrOpenssl')}
          </TabsTrigger>
          <TabsTrigger value="clientside" className="gap-2">
            <Shield className="h-4 w-4" />
            {t('itTools.csrClientSide')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate" className="space-y-4">
          {/* Certificate Details Form */}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('itTools.csrCommonName')} *</Label>
                <Input 
                  placeholder="www.example.com" 
                  value={cn}
                  onChange={(e) => setCn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('itTools.csrKeySize')}</Label>
                <Select value={keySize} onValueChange={setKeySize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2048">2048 bits</SelectItem>
                    <SelectItem value="4096">4096 bits ({t('itTools.recommended')})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* SANs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('itTools.csrSans')}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addSan}>
                  <Plus className="h-4 w-4 me-1" />
                  {t('common.add')}
                </Button>
              </div>
              {sans.map((san, index) => (
                <div key={index} className="flex gap-2">
                  <Select 
                    value={san.type} 
                    onValueChange={(v) => updateSan(index, 'type', v as 'DNS' | 'IP')}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DNS">DNS</SelectItem>
                      <SelectItem value="IP">IP</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder={san.type === 'DNS' ? 'mail.example.com' : '192.168.1.1'}
                    value={san.value}
                    onChange={(e) => updateSan(index, 'value', e.target.value)}
                  />
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="ghost"
                    onClick={() => removeSan(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            {/* Organization Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('itTools.csrOrganization')}</Label>
                <Input 
                  placeholder="My Company Ltd" 
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('itTools.csrOu')}</Label>
                <Input 
                  placeholder="IT Department" 
                  value={organizationalUnit}
                  onChange={(e) => setOrganizationalUnit(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('itTools.csrCountry')}</Label>
                <Input 
                  placeholder="SA" 
                  maxLength={2}
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('itTools.csrState')}</Label>
                <Input 
                  placeholder="Riyadh Region" 
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('itTools.csrLocality')}</Label>
                <Input 
                  placeholder="Riyadh" 
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <Button onClick={handleGenerate} className="w-full gap-2">
            <FileKey className="h-4 w-4" />
            {t('itTools.csrGenerate')}
          </Button>
          
          {/* Generated Outputs */}
          {opensslConfig && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{t('itTools.csrConfigFile')}</CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => copyToClipboard(opensslConfig)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => downloadFile(opensslConfig, `${cn.replace(/\./g, '_')}.cnf`)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    value={opensslConfig} 
                    readOnly 
                    rows={12}
                    className="font-mono text-xs"
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{t('itTools.csrCommands')}</CardTitle>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(opensslCommand)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    value={opensslCommand} 
                    readOnly 
                    rows={10}
                    className="font-mono text-xs"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="clientside" className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('itTools.csrClientSideNote')}</AlertTitle>
            <AlertDescription>
              {t('itTools.csrClientSideDesc')}
            </AlertDescription>
          </Alert>
          
          <Button onClick={generateClientSide} className="w-full gap-2">
            <Shield className="h-4 w-4" />
            {t('itTools.csrGenerateKey')}
          </Button>
          
          {generatedKey && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t('itTools.privateKey')}</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(generatedKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => downloadFile(generatedKey, 'private.key')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={generatedKey} 
                  readOnly 
                  rows={8}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-destructive mt-2">
                  {t('itTools.privateKeyWarning')}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Best Practices */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            {t('itTools.csrBestPractices')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li>{t('itTools.csrTip1')}</li>
            <li>{t('itTools.csrTip2')}</li>
            <li>{t('itTools.csrTip3')}</li>
            <li>{t('itTools.csrTip4')}</li>
            <li>{t('itTools.csrTip5')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const formatPem = (base64: string, type: string): string => {
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${type} KEY-----\n${lines.join('\n')}\n-----END ${type} KEY-----`;
};

export default CsrGenerator;
```

### تحديث ITTools.tsx

```typescript
// إضافة الأداة الجديدة
import CsrGenerator from '@/components/it-tools/crypto/CsrGenerator';

// في قائمة tools
{ 
  id: 'csrGenerator', 
  titleKey: 'itTools.csrGenerator', 
  descKey: 'itTools.csrGeneratorDesc', 
  category: 'crypto', 
  icon: FileKey, 
  component: CsrGenerator 
},
```

### الترجمات لأداة CSR

```typescript
// Arabic
'itTools.csrGenerator': 'منشئ طلب الشهادة (CSR)',
'itTools.csrGeneratorDesc': 'إنشاء طلبات توقيع شهادات SSL/TLS',
'itTools.csrCommonName': 'اسم النطاق (CN)',
'itTools.csrSans': 'الأسماء البديلة (SANs)',
'itTools.csrOrganization': 'المؤسسة (O)',
'itTools.csrOu': 'القسم (OU)',
'itTools.csrCountry': 'الدولة (C)',
'itTools.csrState': 'المنطقة (ST)',
'itTools.csrLocality': 'المدينة (L)',
'itTools.csrKeySize': 'حجم المفتاح',
'itTools.csrGenerate': 'إنشاء الأوامر',
'itTools.csrConfigFile': 'ملف التكوين (openssl.cnf)',
'itTools.csrCommands': 'أوامر OpenSSL',
'itTools.csrOpenssl': 'أوامر OpenSSL',
'itTools.csrClientSide': 'توليد محلي',
'itTools.csrGenerateKey': 'توليد المفتاح الخاص',
'itTools.csrGenerated': 'تم إنشاء ملفات CSR بنجاح',
'itTools.csrCnRequired': 'اسم النطاق مطلوب',
'itTools.csrClientSideNote': 'توليد محلي في المتصفح',
'itTools.csrClientSideDesc': 'يتم توليد المفتاح الخاص في متصفحك فقط - لن يتم إرساله للسيرفر',
'itTools.keyGenerated': 'تم توليد المفتاح الخاص',
'itTools.csrNeedsOpenssl': 'لإنشاء CSR كامل، استخدم أوامر OpenSSL مع المفتاح',
'itTools.fileDownloaded': 'تم تحميل الملف',
'itTools.csrBestPractices': 'أفضل الممارسات',
'itTools.csrTip1': 'احفظ المفتاح الخاص في مكان آمن بصلاحيات 600',
'itTools.csrTip2': 'لا تشارك المفتاح الخاص أبداً',
'itTools.csrTip3': 'استخدم حجم مفتاح 4096 bit للشهادات المهمة',
'itTools.csrTip4': 'احتفظ بنسخة احتياطية مشفرة من المفتاح',
'itTools.csrTip5': 'جدد الشهادة قبل 30 يوماً من انتهائها',

// English
'itTools.csrGenerator': 'Certificate Request (CSR) Generator',
'itTools.csrGeneratorDesc': 'Generate SSL/TLS Certificate Signing Requests',
'itTools.csrCommonName': 'Common Name (CN)',
'itTools.csrSans': 'Subject Alternative Names (SANs)',
'itTools.csrOrganization': 'Organization (O)',
'itTools.csrOu': 'Organizational Unit (OU)',
'itTools.csrCountry': 'Country (C)',
'itTools.csrState': 'State/Province (ST)',
'itTools.csrLocality': 'Locality/City (L)',
'itTools.csrKeySize': 'Key Size',
'itTools.csrGenerate': 'Generate Commands',
'itTools.csrConfigFile': 'Configuration File (openssl.cnf)',
'itTools.csrCommands': 'OpenSSL Commands',
'itTools.csrOpenssl': 'OpenSSL Commands',
'itTools.csrClientSide': 'Client-Side Generation',
'itTools.csrGenerateKey': 'Generate Private Key',
'itTools.csrGenerated': 'CSR files generated successfully',
'itTools.csrCnRequired': 'Common Name is required',
'itTools.csrClientSideNote': 'Local Browser Generation',
'itTools.csrClientSideDesc': 'The private key is generated in your browser only - never sent to the server',
'itTools.keyGenerated': 'Private key generated',
'itTools.csrNeedsOpenssl': 'To create a complete CSR, use OpenSSL commands with the key',
'itTools.fileDownloaded': 'File downloaded',
'itTools.csrBestPractices': 'Best Practices',
'itTools.csrTip1': 'Store private key securely with 600 permissions',
'itTools.csrTip2': 'Never share your private key',
'itTools.csrTip3': 'Use 4096-bit key for critical certificates',
'itTools.csrTip4': 'Keep encrypted backup of private key',
'itTools.csrTip5': 'Renew certificate 30 days before expiration',
```

---

## ملخص الملفات المطلوب تعديلها/إنشاؤها

| الملف | الإجراء |
|-------|---------|
| `src/pages/Register.tsx` | **حذف** |
| `src/App.tsx` | تحديث - إزالة Register، إضافة ResetPassword route |
| `src/pages/Login.tsx` | تحديث - إضافة Forgot Password flow + تحسين التصميم |
| `src/pages/ResetPassword.tsx` | **إنشاء جديد** |
| `src/utils/seedData.ts` | **إعادة كتابة كاملة** |
| `src/components/layout/Sidebar.tsx` | تحديث - تحسين العنوان |
| `src/components/it-tools/crypto/CsrGenerator.tsx` | **إنشاء جديد** |
| `src/pages/ITTools.tsx` | تحديث - إضافة CSR tool |
| `src/contexts/LanguageContext.tsx` | تحديث - إضافة ترجمات جديدة |

---

## ترتيب التنفيذ

| # | المهمة | الأولوية |
|---|--------|----------|
| 1 | حذف Register.tsx وتحديث App.tsx | عالية |
| 2 | إنشاء ResetPassword.tsx | عالية |
| 3 | تحديث Login.tsx (Forgot Password + Design) | عالية |
| 4 | إعادة كتابة seedData.ts | عالية |
| 5 | تحديث Sidebar.tsx (العنوان) | متوسطة |
| 6 | إنشاء CsrGenerator.tsx | متوسطة |
| 7 | تحديث ITTools.tsx | متوسطة |
| 8 | إضافة جميع الترجمات | عالية |

---

## التحقق النهائي

- [ ] /register يحول إلى /login
- [ ] زر "نسيت كلمة المرور" يعمل
- [ ] صفحة ResetPassword تعمل مع recovery token
- [ ] تحذير SMTP يظهر عند عدم التكوين
- [ ] بيانات seed الجديدة تعمل (3 domains)
- [ ] Domain Summary يظهر Critical Roles
- [ ] أداة CSR تعمل بالكامل
- [ ] العنوان IT (gold) Infrastructure (teal) يظهر صحيحاً
- [ ] جميع الفلاتر تعمل مع البيانات الجديدة
