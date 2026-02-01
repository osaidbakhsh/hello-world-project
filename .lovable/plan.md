
# خطة إضافة جميع أدوات IT المتبقية من it-tools.tech

## ملخص التحليل

### الأدوات الموجودة حالياً (23 أداة):
**Crypto (5):** Token Generator, Hash Generator, UUID Generator, Base64 Tool, Password Analyzer
**Network (4):** Subnet Calculator, IP Converter, MAC Generator, Port Generator
**Converters (5):** JSON↔YAML, JSON Prettify, Base Converter, Date Converter, Case Converter
**Text (5):** Text Diff, URL Encoder, Lorem Ipsum, Text Stats, Regex Tester
**Development (4):** Crontab Generator, Chmod Calculator, HTTP Status Codes, JWT Parser

### الأدوات المطلوب إضافتها (55+ أداة جديدة):

---

## الفئات والأدوات الجديدة

### 1. Crypto & Security (إضافة 6 أدوات)
| الأداة | الوصف | التقنية |
|--------|-------|---------|
| Bcrypt Generator | تشفير bcrypt للنصوص | bcryptjs library |
| ULID Generator | توليد معرفات ULID | ulid library |
| Encrypt/Decrypt Text | تشفير AES للنصوص | Web Crypto API |
| HMAC Generator | توليد HMAC | Web Crypto API |
| BIP39 Generator | توليد عبارات استرداد | wordlist + random |
| RSA Key Pair | توليد مفاتيح RSA | Web Crypto API |

### 2. Network (إضافة 3 أدوات)
| الأداة | الوصف | التقنية |
|--------|-------|---------|
| IPv4 Range Expander | توسيع نطاق IP | JavaScript math |
| MAC Address Lookup | البحث عن الشركة المصنعة | OUI database |
| IPv6 ULA Generator | توليد عناوين IPv6 | Random generation |

### 3. Converters (إضافة 15 أداة)
| الأداة | الوصف | التقنية |
|--------|-------|---------|
| Roman Numeral Converter | تحويل أرقام رومانية | JS algorithm |
| Color Converter | HEX ↔ RGB ↔ HSL | Math conversion |
| Text to NATO | تحويل لأبجدية الناتو | Mapping |
| Text to ASCII Binary | تحويل لثنائي | charCodeAt |
| Text to Unicode | تحويل لـ Unicode | codePointAt |
| YAML to TOML | تحويل YAML لـ TOML | Parsing |
| JSON to TOML | تحويل JSON لـ TOML | Parsing |
| TOML to JSON | تحويل TOML لـ JSON | Parsing |
| TOML to YAML | تحويل TOML لـ YAML | Parsing |
| XML to JSON | تحويل XML لـ JSON | DOMParser |
| JSON to XML | تحويل JSON لـ XML | Serialization |
| List Converter | تحويل القوائم | String manipulation |
| Markdown to HTML | تحويل Markdown لـ HTML | marked library |
| Base64 File Converter | تحويل ملفات | FileReader API |
| JSON to CSV | تحويل JSON لـ CSV | Parsing |

### 4. Web Tools (فئة جديدة - 12 أداة)
| الأداة | الوصف | التقنية |
|--------|-------|---------|
| HTML Entities Escape | ترميز HTML entities | String replace |
| URL Parser | تحليل URL | URL API |
| Device Information | معلومات الجهاز | Navigator API |
| Basic Auth Generator | توليد Basic Auth | Base64 encoding |
| OTP Generator | توليد OTP/TOTP | HOTP/TOTP algorithm |
| MIME Types Reference | مرجع أنواع MIME | Static data |
| Keycode Info | معلومات مفاتيح لوحة المفاتيح | KeyboardEvent |
| Slugify String | تحويل لـ slug | String manipulation |
| User-Agent Parser | تحليل User-Agent | Regex parsing |
| JSON Diff | مقارنة JSON | Deep comparison |
| Safelink Decoder | فك تشفير روابط Outlook | URL decode |
| Open Graph Generator | توليد Open Graph meta | Template |

### 5. Images & Videos (فئة جديدة - 4 أدوات)
| الأداة | الوصف | التقنية |
|--------|-------|---------|
| QR Code Generator | توليد QR Code | qrcode library |
| WiFi QR Generator | توليد QR للـ WiFi | qrcode library |
| SVG Placeholder | توليد صور placeholder | SVG generation |
| Camera Recorder | تسجيل الكاميرا | MediaRecorder API |

### 6. Math (فئة جديدة - 3 أدوات)
| الأداة | الوصف | التقنية |
|--------|-------|---------|
| Math Evaluator | حاسبة رياضية | eval/parser |
| ETA Calculator | حساب الوقت المتبقي | Math |
| Percentage Calculator | حاسبة النسب المئوية | Math |

### 7. Measurement (فئة جديدة - 3 أدوات)
| الأداة | الوصف | التقنية |
|--------|-------|---------|
| Chronometer | ساعة إيقاف | setInterval |
| Temperature Converter | تحويل درجات الحرارة | Math formulas |
| Benchmark Builder | اختبار الأداء | Performance API |

### 8. Text (إضافة 5 أدوات)
| الأداة | الوصف | التقنية |
|--------|-------|---------|
| Emoji Picker | اختيار الإيموجي | Emoji database |
| String Obfuscator | تشويش النصوص | Character mapping |
| Numeronym Generator | توليد numeronyms | String manipulation |
| ASCII Art Generator | توليد نص ASCII | figlet pattern |

### 9. Data (فئة جديدة - 2 أداة)
| الأداة | الوصف | التقنية |
|--------|-------|---------|
| Phone Parser | تحليل أرقام الهواتف | libphonenumber-js |
| IBAN Validator | التحقق من IBAN | IBAN algorithm |

### 10. Development (إضافة 6 أدوات)
| الأداة | الوصف | التقنية |
|--------|-------|---------|
| Git Cheatsheet | مرجع أوامر Git | Static data |
| SQL Prettify | تنسيق SQL | sql-formatter |
| Docker Compose Converter | تحويل docker run | Parsing |
| XML Formatter | تنسيق XML | DOMParser |
| YAML Prettify | تنسيق YAML | yaml library |
| Email Normalizer | تطبيع الإيميلات | String manipulation |
| Regex Cheatsheet | مرجع Regex | Static data |

---

## هيكل الملفات الجديدة

```text
src/components/it-tools/
├── crypto/
│   ├── (existing 5 files)
│   ├── BcryptGenerator.tsx
│   ├── UlidGenerator.tsx
│   ├── EncryptDecryptText.tsx
│   ├── HmacGenerator.tsx
│   ├── Bip39Generator.tsx
│   └── RsaKeyGenerator.tsx
├── network/
│   ├── (existing 4 files)
│   ├── IPv4RangeExpander.tsx
│   ├── MacAddressLookup.tsx
│   └── IPv6UlaGenerator.tsx
├── converters/
│   ├── (existing 5 files)
│   ├── RomanConverter.tsx
│   ├── ColorConverter.tsx
│   ├── NatoAlphabet.tsx
│   ├── TextToBinary.tsx
│   ├── TextToUnicode.tsx
│   ├── TomlConverter.tsx
│   ├── XmlJsonConverter.tsx
│   ├── ListConverter.tsx
│   ├── MarkdownToHtml.tsx
│   ├── Base64FileConverter.tsx
│   └── JsonToCsv.tsx
├── web/ (NEW)
│   ├── HtmlEntities.tsx
│   ├── UrlParser.tsx
│   ├── DeviceInfo.tsx
│   ├── BasicAuthGenerator.tsx
│   ├── OtpGenerator.tsx
│   ├── MimeTypes.tsx
│   ├── KeycodeInfo.tsx
│   ├── SlugifyString.tsx
│   ├── UserAgentParser.tsx
│   ├── JsonDiff.tsx
│   ├── SafelinkDecoder.tsx
│   └── OpenGraphGenerator.tsx
├── images/ (NEW)
│   ├── QrCodeGenerator.tsx
│   ├── WifiQrGenerator.tsx
│   ├── SvgPlaceholder.tsx
│   └── CameraRecorder.tsx
├── math/ (NEW)
│   ├── MathEvaluator.tsx
│   ├── EtaCalculator.tsx
│   └── PercentageCalculator.tsx
├── measurement/ (NEW)
│   ├── Chronometer.tsx
│   ├── TemperatureConverter.tsx
│   └── BenchmarkBuilder.tsx
├── text/
│   ├── (existing 5 files)
│   ├── EmojiPicker.tsx
│   ├── StringObfuscator.tsx
│   ├── NumeronymGenerator.tsx
│   └── AsciiArtGenerator.tsx
├── data/ (NEW)
│   ├── PhoneParser.tsx
│   └── IbanValidator.tsx
└── development/
    ├── (existing 4 files)
    ├── GitCheatsheet.tsx
    ├── SqlPrettify.tsx
    ├── DockerComposeConverter.tsx
    ├── XmlFormatter.tsx
    ├── YamlPrettify.tsx
    ├── EmailNormalizer.tsx
    └── RegexCheatsheet.tsx
```

---

## المكتبات المطلوبة

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "qrcode": "^1.5.3",
    "marked": "^12.0.0",
    "sql-formatter": "^15.0.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/qrcode": "^1.5.5"
  }
}
```

ملاحظة: معظم الأدوات ستستخدم Web APIs الأصلية (Crypto, URL, Navigator, etc.) بدون مكتبات خارجية.

---

## تحديث ITTools.tsx

سيتم إضافة الفئات الجديدة:

```typescript
const categories = [
  { id: 'all', labelKey: 'common.all', icon: null },
  { id: 'favorites', labelKey: 'itTools.favorites', icon: Star },
  { id: 'crypto', labelKey: 'itTools.crypto', icon: Shield },
  { id: 'network', labelKey: 'itTools.network', icon: Network },
  { id: 'converters', labelKey: 'itTools.converters', icon: ArrowLeftRight },
  { id: 'web', labelKey: 'itTools.web', icon: Globe },           // NEW
  { id: 'images', labelKey: 'itTools.images', icon: Image },     // NEW
  { id: 'math', labelKey: 'itTools.math', icon: Calculator },    // NEW
  { id: 'measurement', labelKey: 'itTools.measurement', icon: Timer }, // NEW
  { id: 'text', labelKey: 'itTools.text', icon: Type },
  { id: 'data', labelKey: 'itTools.data', icon: Database },      // NEW
  { id: 'development', labelKey: 'itTools.development', icon: Code },
];
```

---

## الترجمات المطلوبة (200+ مفتاح جديد)

### فئات جديدة
```typescript
// Arabic
'itTools.web': 'الويب',
'itTools.images': 'الصور والفيديو',
'itTools.math': 'الرياضيات',
'itTools.measurement': 'القياسات',
'itTools.data': 'البيانات',

// English
'itTools.web': 'Web',
'itTools.images': 'Images & Videos',
'itTools.math': 'Math',
'itTools.measurement': 'Measurement',
'itTools.data': 'Data',
```

### أمثلة على الترجمات للأدوات
```typescript
// Bcrypt
'itTools.bcryptGenerator': 'مولد Bcrypt' / 'Bcrypt Generator',
'itTools.bcryptGeneratorDesc': 'تشفير النصوص باستخدام Bcrypt' / 'Hash text using Bcrypt',

// QR Code
'itTools.qrCodeGenerator': 'مولد QR Code' / 'QR Code Generator',
'itTools.qrCodeGeneratorDesc': 'توليد رموز QR' / 'Generate QR codes',

// Color Converter
'itTools.colorConverter': 'محول الألوان' / 'Color Converter',
'itTools.colorConverterDesc': 'تحويل بين HEX, RGB, HSL' / 'Convert between HEX, RGB, HSL',
```

---

## خطوات التنفيذ (مراحل)

### المرحلة 1: Crypto Tools (6 أدوات)
1. إنشاء BcryptGenerator.tsx
2. إنشاء UlidGenerator.tsx
3. إنشاء EncryptDecryptText.tsx
4. إنشاء HmacGenerator.tsx
5. إنشاء Bip39Generator.tsx
6. إنشاء RsaKeyGenerator.tsx

### المرحلة 2: Network Tools (3 أدوات)
1. إنشاء IPv4RangeExpander.tsx
2. إنشاء MacAddressLookup.tsx
3. إنشاء IPv6UlaGenerator.tsx

### المرحلة 3: Converters (11 أداة)
1. إنشاء RomanConverter.tsx
2. إنشاء ColorConverter.tsx
3. إنشاء NatoAlphabet.tsx
4. إنشاء TextToBinary.tsx
5. إنشاء TextToUnicode.tsx
6. إنشاء TomlConverter.tsx
7. إنشاء XmlJsonConverter.tsx
8. إنشاء ListConverter.tsx
9. إنشاء MarkdownToHtml.tsx
10. إنشاء Base64FileConverter.tsx
11. إنشاء JsonToCsv.tsx

### المرحلة 4: Web Tools (12 أداة)
1. إنشاء HtmlEntities.tsx
2. إنشاء UrlParser.tsx
3. إنشاء DeviceInfo.tsx
4. إنشاء BasicAuthGenerator.tsx
5. إنشاء OtpGenerator.tsx
6. إنشاء MimeTypes.tsx
7. إنشاء KeycodeInfo.tsx
8. إنشاء SlugifyString.tsx
9. إنشاء UserAgentParser.tsx
10. إنشاء JsonDiff.tsx
11. إنشاء SafelinkDecoder.tsx
12. إنشاء OpenGraphGenerator.tsx

### المرحلة 5: Images & Videos (4 أدوات)
1. إنشاء QrCodeGenerator.tsx (+ install qrcode)
2. إنشاء WifiQrGenerator.tsx
3. إنشاء SvgPlaceholder.tsx
4. إنشاء CameraRecorder.tsx

### المرحلة 6: Math & Measurement (6 أدوات)
1. إنشاء MathEvaluator.tsx
2. إنشاء EtaCalculator.tsx
3. إنشاء PercentageCalculator.tsx
4. إنشاء Chronometer.tsx
5. إنشاء TemperatureConverter.tsx
6. إنشاء BenchmarkBuilder.tsx

### المرحلة 7: Text Tools (4 أدوات)
1. إنشاء EmojiPicker.tsx
2. إنشاء StringObfuscator.tsx
3. إنشاء NumeronymGenerator.tsx
4. إنشاء AsciiArtGenerator.tsx

### المرحلة 8: Data Tools (2 أداة)
1. إنشاء PhoneParser.tsx
2. إنشاء IbanValidator.tsx

### المرحلة 9: Development Tools (7 أدوات)
1. إنشاء GitCheatsheet.tsx
2. إنشاء SqlPrettify.tsx (+ install sql-formatter)
3. إنشاء DockerComposeConverter.tsx
4. إنشاء XmlFormatter.tsx
5. إنشاء YamlPrettify.tsx
6. إنشاء EmailNormalizer.tsx
7. إنشاء RegexCheatsheet.tsx

### المرحلة 10: التكامل والاختبار
1. تحديث ITTools.tsx مع جميع الأدوات الجديدة
2. إضافة جميع الترجمات في LanguageContext.tsx
3. اختبار كل أداة

---

## ملاحظات تقنية

1. **بدون مكتبات قدر الإمكان**: استخدام Web APIs الأصلية
   - Web Crypto API للتشفير
   - URL API لتحليل الروابط
   - Navigator API لمعلومات الجهاز
   - MediaRecorder API للتسجيل
   - DOMParser للـ XML

2. **المكتبات الضرورية فقط**:
   - `qrcode`: لتوليد QR (لا بديل أصلي)
   - `marked`: لتحويل Markdown (اختياري)
   - `sql-formatter`: لتنسيق SQL (اختياري)

3. **الأداء**: جميع الأدوات تعمل client-side بدون طلبات للسيرفر

4. **RTL Support**: جميع الأدوات ستدعم العربية والإنجليزية

