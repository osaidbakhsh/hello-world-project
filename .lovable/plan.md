
# خطة إضافة صفحة أدوات IT (IT Tools)

## نظرة عامة
إنشاء صفحة جديدة متكاملة تحتوي على مجموعة من أدوات IT المفيدة مستوحاة من موقع it-tools.tech، تعمل بالكامل في المتصفح (client-side) بدون الحاجة لخادم خارجي.

---

## الأدوات المختارة (مرتبة حسب الأهمية لفريق IT)

### 1. أدوات التشفير والأمان (Crypto)
| الأداة | الوصف |
|--------|-------|
| **Token Generator** | توليد نصوص عشوائية (كلمات مرور، مفاتيح API) |
| **Hash Generator** | تشفير النصوص بـ MD5, SHA1, SHA256, SHA512 |
| **UUID Generator** | توليد معرفات فريدة عالمياً |
| **Base64 Encoder/Decoder** | تشفير وفك تشفير Base64 |
| **Password Strength Analyzer** | تحليل قوة كلمات المرور |

### 2. أدوات الشبكات (Network)
| الأداة | الوصف |
|--------|-------|
| **IPv4 Subnet Calculator** | حساب الـ subnet من CIDR |
| **IPv4 Address Converter** | تحويل IP بين الأنظمة (binary, hex, decimal) |
| **MAC Address Generator** | توليد عناوين MAC عشوائية |
| **Random Port Generator** | توليد أرقام منافذ عشوائية |

### 3. أدوات المحولات (Converters)
| الأداة | الوصف |
|--------|-------|
| **JSON ↔ YAML** | تحويل بين JSON و YAML |
| **JSON Prettify/Minify** | تنسيق وضغط JSON |
| **Base Converter** | تحويل الأرقام بين الأنظمة (binary, hex, octal) |
| **Date-Time Converter** | تحويل التواريخ بين الصيغ المختلفة |
| **Case Converter** | تحويل حالة النص (UPPER, lower, camelCase) |

### 4. أدوات النصوص (Text)
| الأداة | الوصف |
|--------|-------|
| **Text Diff** | مقارنة نصين وإظهار الفروقات |
| **URL Encoder/Decoder** | ترميز وفك ترميز URL |
| **Lorem Ipsum Generator** | توليد نص تجريبي |
| **Text Statistics** | إحصائيات النص (الكلمات، الأحرف، الحجم) |
| **Regex Tester** | اختبار التعبيرات النمطية |

### 5. أدوات التطوير (Development)
| الأداة | الوصف |
|--------|-------|
| **Crontab Generator** | إنشاء جداول cron |
| **Chmod Calculator** | حساب صلاحيات Unix |
| **HTTP Status Codes** | مرجع لأكواد HTTP |
| **JWT Parser** | تحليل رموز JWT |

---

## هيكل الملفات الجديدة

```text
src/
├── pages/
│   └── ITTools.tsx                    # الصفحة الرئيسية
├── components/
│   └── it-tools/
│       ├── ToolCard.tsx               # بطاقة الأداة
│       ├── ToolSearch.tsx             # شريط البحث والتصفية
│       ├── crypto/
│       │   ├── TokenGenerator.tsx
│       │   ├── HashGenerator.tsx
│       │   ├── UUIDGenerator.tsx
│       │   ├── Base64Tool.tsx
│       │   └── PasswordAnalyzer.tsx
│       ├── network/
│       │   ├── SubnetCalculator.tsx
│       │   ├── IPConverter.tsx
│       │   ├── MACGenerator.tsx
│       │   └── PortGenerator.tsx
│       ├── converters/
│       │   ├── JsonYamlConverter.tsx
│       │   ├── JsonPrettify.tsx
│       │   ├── BaseConverter.tsx
│       │   ├── DateConverter.tsx
│       │   └── CaseConverter.tsx
│       ├── text/
│       │   ├── TextDiff.tsx
│       │   ├── UrlEncoder.tsx
│       │   ├── LoremIpsum.tsx
│       │   ├── TextStats.tsx
│       │   └── RegexTester.tsx
│       └── development/
│           ├── CrontabGenerator.tsx
│           ├── ChmodCalculator.tsx
│           ├── HttpStatusCodes.tsx
│           └── JwtParser.tsx
```

---

## تصميم واجهة المستخدم

### الصفحة الرئيسية
- شريط بحث في الأعلى للبحث السريع
- تبويبات للفئات (التشفير، الشبكات، المحولات، النصوص، التطوير)
- عرض البطاقات بشكل Grid
- كل بطاقة تفتح dialog/modal للأداة

### بطاقة الأداة
- أيقونة معبرة
- عنوان ووصف مختصر
- علامة للأدوات المفضلة (تحفظ في localStorage)
- نقرة تفتح الأداة في Dialog

### داخل الأداة
- حقول الإدخال المطلوبة
- زر التنفيذ
- منطقة النتائج مع زر النسخ
- دعم كامل للعربية والإنجليزية

---

## التفاصيل التقنية

### المكتبات المطلوبة
لا حاجة لمكتبات إضافية - جميع العمليات تتم باستخدام:
- Web Crypto API (للتشفير)
- JavaScript الأصلي (للتحويلات)
- المكونات الموجودة (shadcn/ui)

### أمثلة على الكود

**Token Generator:**
```typescript
const generateToken = (length: number, options: TokenOptions) => {
  const chars = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };
  let pool = '';
  if (options.lowercase) pool += chars.lowercase;
  if (options.uppercase) pool += chars.uppercase;
  if (options.numbers) pool += chars.numbers;
  if (options.symbols) pool += chars.symbols;
  
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, x => pool[x % pool.length]).join('');
};
```

**Hash Generator (using Web Crypto API):**
```typescript
const hashText = async (text: string, algorithm: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
```

**Subnet Calculator:**
```typescript
const calculateSubnet = (cidr: string) => {
  const [ip, prefix] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(prefix)) - 1);
  const ipNum = ipToNumber(ip);
  const network = ipNum & mask;
  const broadcast = network | ~mask;
  return {
    network: numberToIp(network),
    broadcast: numberToIp(broadcast >>> 0),
    firstHost: numberToIp(network + 1),
    lastHost: numberToIp((broadcast >>> 0) - 1),
    totalHosts: 2 ** (32 - parseInt(prefix)) - 2,
    mask: numberToIp(mask >>> 0)
  };
};
```

---

## الترجمات المطلوبة

```typescript
// Navigation
'nav.itTools': 'أدوات IT' / 'IT Tools'

// Categories
'itTools.title': 'صندوق أدوات IT' / 'IT Toolbox'
'itTools.search': 'ابحث عن أداة...' / 'Search for a tool...'
'itTools.crypto': 'التشفير والأمان' / 'Crypto & Security'
'itTools.network': 'الشبكات' / 'Network'
'itTools.converters': 'المحولات' / 'Converters'
'itTools.text': 'النصوص' / 'Text'
'itTools.development': 'التطوير' / 'Development'
'itTools.favorites': 'المفضلة' / 'Favorites'

// Tools
'itTools.tokenGenerator': 'مولد الرموز' / 'Token Generator'
'itTools.hashGenerator': 'مولد الهاش' / 'Hash Generator'
'itTools.uuidGenerator': 'مولد UUID' / 'UUID Generator'
// ... المزيد من الترجمات
```

---

## التكامل مع النظام

### 1. إضافة المسار في App.tsx
```typescript
import ITTools from './pages/ITTools';
// ...
<Route path="/it-tools" element={<ITTools />} />
```

### 2. إضافة في القائمة الجانبية (Sidebar.tsx)
```typescript
{ id: 'itTools', path: '/it-tools', icon: Wrench, label: 'nav.itTools' }
```

### 3. إضافة في إعدادات ترتيب القائمة
```typescript
{ id: 'itTools', labelKey: 'nav.itTools', enabled: true }
```

---

## خطوات التنفيذ

| المرحلة | الوصف |
|---------|-------|
| 1 | إنشاء الصفحة الرئيسية `ITTools.tsx` مع البحث والتبويبات |
| 2 | إنشاء مكونات الأدوات الأساسية (ToolCard, ToolSearch) |
| 3 | تنفيذ أدوات التشفير (Token, Hash, UUID, Base64, Password) |
| 4 | تنفيذ أدوات الشبكات (Subnet, IP, MAC, Port) |
| 5 | تنفيذ المحولات (JSON/YAML, Base, Date, Case) |
| 6 | تنفيذ أدوات النصوص (Diff, URL, Lorem, Stats, Regex) |
| 7 | تنفيذ أدوات التطوير (Cron, Chmod, HTTP, JWT) |
| 8 | إضافة الترجمات وتحديث القائمة الجانبية |
| 9 | إضافة نظام المفضلة (localStorage) |

---

## ميزات إضافية مقترحة

1. **نظام المفضلة**: حفظ الأدوات المستخدمة بكثرة
2. **السجل**: حفظ آخر العمليات المنفذة
3. **مشاركة النتائج**: نسخ أو تصدير النتائج
4. **اختصارات لوحة المفاتيح**: Ctrl+K للبحث السريع
5. **وضع ملء الشاشة**: للأدوات التي تحتاج مساحة أكبر
