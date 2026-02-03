
# خطة شاملة لإضافة التحقق من صحة البيانات (Data Validation)

---

## نظرة عامة

هذه الخطة تغطي جميع النماذج والميزات في التطبيق التي تحتاج إلى تحقق صارم من البيانات باستخدام مكتبة **Zod** المثبتة مسبقاً.

---

## الملفات الموجودة للتحقق

لدينا بالفعل ملف `src/lib/validations.ts` يحتوي على:
- التحقق من IPv4/IPv6
- التحقق من CIDR
- التحقق من MAC Address
- التحقق من المنافذ (Ports)
- التحقق من البريد الإلكتروني
- مخططات للسيرفرات والشبكات

---

## الميزات المطلوب إضافة التحقق لها

### 1. السيرفرات (Servers) ⚠️ تحقق جزئي

**الملف:** `src/pages/Servers.tsx`

**الحالة الحالية:** تحقق بسيط (الاسم و IP مطلوبان فقط)

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `ip_address` | صيغة IPv4 صالحة |
| `cpu` | رقم موجب (عدد النوى) |
| `ram` | رقم موجب (GB) |
| `disk_space` | رقم موجب (GB/TB) |
| `rpo_hours` | رقم موجب (ساعات) |
| `rto_hours` | رقم موجب (ساعات) |
| `warranty_end` | تاريخ صالح وبعد تاريخ الشراء |
| `eol_date` | تاريخ صالح |
| `eos_date` | تاريخ صالح وبعد eol_date |

---

### 2. الشبكات (Networks) ⚠️ تحقق جزئي

**الملف:** `src/pages/Networks.tsx`

**الحالة الحالية:** تحقق من الاسم والدومين فقط

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `subnet` | صيغة CIDR صالحة (192.168.1.0/24) |
| `gateway` | صيغة IPv4 صالحة |
| `dns_servers` | قائمة عناوين IP صالحة مفصولة بفواصل |
| `vlan_id` | رقم بين 1 و 4094 |

---

### 3. التراخيص (Licenses) ⚠️ تحقق جزئي

**الملف:** `src/pages/Licenses.tsx`

**الحالة الحالية:** تحقق من الاسم وتاريخ الانتهاء

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `expiry_date` | تاريخ صالح وبعد تاريخ الشراء |
| `cost` | رقم موجب |
| `quantity` | رقم صحيح موجب ≥ 1 |
| `license_key` | حد أقصى 500 حرف |

---

### 4. تطبيقات الويب (WebApps) ❌ بدون تحقق

**الملف:** `src/pages/WebApps.tsx`

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `name` | مطلوب، 1-100 حرف |
| `url` | صيغة URL صالحة (https://...) |
| `description` | حد أقصى 500 حرف |
| `category` | حد أقصى 50 حرف |

---

### 5. المهام (Tasks) ❌ بدون تحقق

**الملف:** `src/pages/Tasks.tsx`

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `title` | مطلوب، 1-200 حرف |
| `description` | حد أقصى 2000 حرف |
| `due_date` | تاريخ صالح (ليس في الماضي للمهام الجديدة) |

---

### 6. الإجازات (Vacations) ✅ تحقق جزئي موجود

**الملف:** `src/pages/Vacations.tsx`

**الحالة الحالية:** تحقق من تاريخ البداية قبل النهاية ✅

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `start_date` | ليس في الماضي البعيد (30 يوم كحد أقصى) |
| `notes` | حد أقصى 500 حرف |
| `days_count` | حد أقصى معقول (60 يوم مثلاً) |

---

### 7. نوافذ الصيانة (Maintenance Windows) ❌ بدون تحقق

**الملف:** `src/pages/MaintenanceWindows.tsx`

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `title` | مطلوب، 1-200 حرف |
| `start_time` | تاريخ ووقت صالح |
| `end_time` | بعد وقت البداية |
| `description` | حد أقصى 1000 حرف |

---

### 8. جداول المناوبات (On-Call Schedules) ❌ بدون تحقق

**الملف:** `src/pages/OnCallSchedule.tsx`

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `name` | مطلوب، 1-100 حرف |
| `team_members` | قائمة غير فارغة (عضو واحد على الأقل) |
| `rotation_type` | قيمة من القيم المسموحة فقط |

---

### 9. مشاركات الملفات (File Shares) ⚠️ تحقق جزئي

**الملف:** `src/components/fileshares/FileShareForm.tsx`

**الحالة الحالية:** تحقق من الحقول المطلوبة

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `path` | صيغة مسار صالحة (\\\\server\\share أو /path/to/share) |
| `scan_depth` | رقم بين 1 و 50 |
| `exclude_patterns` | كل نمط ≤ 200 حرف |

---

### 10. خزينة كلمات المرور (Vault) ❌ بدون تحقق

**الملف:** `src/components/vault/VaultItemForm.tsx`

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `title` | مطلوب، 1-100 حرف |
| `username` | حد أقصى 255 حرف |
| `password` | مطلوب للإنشاء، قوة كلمة المرور |
| `url` | صيغة URL صالحة (إن وجد) |
| `notes` | حد أقصى 2000 حرف |

---

### 11. مركز البيانات (Datacenter) ❌ بدون تحقق

**الملف:** `src/components/datacenter/DatacenterForm.tsx`

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `name` | مطلوب، 1-100 حرف |
| `location` | حد أقصى 200 حرف |
| `power_capacity_kw` | رقم موجب |
| `rack_count` | رقم صحيح موجب |

---

### 12. الكلسترات (Clusters) ❌ بدون تحقق

**الملف:** `src/components/datacenter/ClusterForm.tsx`

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `name` | مطلوب، 1-100 حرف |
| `platform_version` | صيغة نسخة صالحة (X.Y.Z) |
| `node_count` | رقم صحيح ≥ 0 |

---

### 13. فحص الشبكة (Network Scan) ⚠️ تحقق جزئي

**الملف:** `src/pages/NetworkScan.tsx`

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `scan_name` | مطلوب، 1-100 حرف |
| `ip_range` | صيغة CIDR صالحة |
| `max_hosts` | رقم بين 1 و 65535 |

---

### 14. إعدادات البريد (Mail Settings) ❌ بدون تحقق

**الملف:** `src/pages/Settings.tsx`

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `smtp_host` | hostname صالح |
| `smtp_port` | رقم بين 1 و 65535 |
| `smtp_from_email` | بريد إلكتروني صالح |

---

### 15. إعدادات LDAP ❌ بدون تحقق

**الملف:** `src/pages/Settings.tsx`

**التحسينات المطلوبة:**
| الحقل | نوع التحقق |
|-------|-----------|
| `ldap_host` | hostname صالح |
| `ldap_port` | رقم بين 1 و 65535 |
| `ldap_base_dn` | صيغة DN صالحة |

---

## خطة التنفيذ

### المرحلة 1: تحديث ملف التحقق الرئيسي

**الملف:** `src/lib/validations.ts`

إضافة المخططات التالية:
```typescript
// Web Apps Schema
export const webAppFormSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url('Invalid URL format'),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  domain_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
});

// Tasks Schema
export const taskFormSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  frequency: z.enum(['once', 'daily', 'weekly', 'monthly']),
});

// Maintenance Window Schema
export const maintenanceWindowSchema = z.object({
  title: z.string().min(1).max(200),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  description: z.string().max(1000).optional(),
  impact_level: z.enum(['low', 'medium', 'high', 'critical']),
}).refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  { message: 'End time must be after start time' }
);

// On-Call Schedule Schema
export const onCallScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  rotation_type: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  team_members: z.array(z.string().uuid()).min(1),
});

// Vault Item Schema
export const vaultItemSchema = z.object({
  title: z.string().min(1).max(100),
  username: z.string().max(255).optional(),
  password: z.string().min(1, 'Password is required'),
  url: z.string().url().optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
  item_type: z.enum(['server', 'website', 'network_device', 'application', 'api_key', 'other']),
});

// License Schema with date validation
export const licenseFormSchema = z.object({
  name: z.string().min(1).max(100),
  vendor: z.string().max(100).optional(),
  license_key: z.string().max(500).optional(),
  purchase_date: z.string().optional(),
  expiry_date: z.string(),
  cost: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(1),
}).refine(
  (data) => !data.purchase_date || !data.expiry_date || 
    new Date(data.expiry_date) > new Date(data.purchase_date),
  { message: 'Expiry date must be after purchase date' }
);

// Settings Schemas
export const mailSettingsSchema = z.object({
  smtp_host: hostnameSchema,
  smtp_port: portCoerceSchema,
  smtp_from_email: z.string().email().optional(),
});

export const ldapSettingsSchema = z.object({
  ldap_host: hostnameSchema,
  ldap_port: portCoerceSchema,
  ldap_base_dn: dnSchema,
});
```

---

### المرحلة 2: تطبيق التحقق على كل صفحة

لكل صفحة، سيتم:
1. استيراد المخطط المناسب من `validations.ts`
2. استخدام `schema.safeParse(formData)` قبل الحفظ
3. عرض رسائل الخطأ للمستخدم باستخدام Toast
4. إضافة تحقق مرئي على الحقول (حدود حمراء للحقول الخاطئة)

---

### المرحلة 3: إضافة مفاتيح الترجمة

**الملف:** `src/contexts/LanguageContext.tsx`

```typescript
// Validation Messages
'validation.required': 'هذا الحقل مطلوب',
'validation.invalidIP': 'عنوان IP غير صالح',
'validation.invalidURL': 'رابط URL غير صالح',
'validation.invalidEmail': 'بريد إلكتروني غير صالح',
'validation.invalidCIDR': 'صيغة CIDR غير صالحة',
'validation.invalidPort': 'رقم المنفذ يجب أن يكون بين 1 و 65535',
'validation.maxLength': 'تجاوز الحد الأقصى للأحرف',
'validation.minLength': 'الحد الأدنى للأحرف غير متحقق',
'validation.positiveNumber': 'يجب أن يكون رقماً موجباً',
'validation.endAfterStart': 'تاريخ النهاية يجب أن يكون بعد البداية',
'validation.expiryAfterPurchase': 'تاريخ الانتهاء يجب أن يكون بعد الشراء',
```

---

## ملخص الملفات المطلوب تعديلها

| الملف | التغييرات |
|-------|----------|
| `src/lib/validations.ts` | إضافة 10+ مخططات جديدة |
| `src/contexts/LanguageContext.tsx` | إضافة مفاتيح ترجمة التحقق |
| `src/pages/Servers.tsx` | تطبيق serverFormSchema |
| `src/pages/Networks.tsx` | تطبيق networkFormSchema |
| `src/pages/Licenses.tsx` | تطبيق licenseFormSchema |
| `src/pages/WebApps.tsx` | تطبيق webAppFormSchema |
| `src/pages/Tasks.tsx` | تطبيق taskFormSchema |
| `src/pages/Vacations.tsx` | تعزيز التحقق الموجود |
| `src/pages/MaintenanceWindows.tsx` | تطبيق maintenanceWindowSchema |
| `src/pages/OnCallSchedule.tsx` | تطبيق onCallScheduleSchema |
| `src/pages/NetworkScan.tsx` | تطبيق scanJobSchema |
| `src/pages/Settings.tsx` | تطبيق mail/ldap schemas |
| `src/components/fileshares/FileShareForm.tsx` | تطبيق fileShareSchema |
| `src/components/vault/VaultItemForm.tsx` | تطبيق vaultItemSchema |
| `src/components/datacenter/DatacenterForm.tsx` | تطبيق datacenterSchema |
| `src/components/datacenter/ClusterForm.tsx` | تعزيز التحقق |

---

## النتيجة المتوقعة

- ✅ جميع النماذج تستخدم Zod للتحقق
- ✅ رسائل خطأ واضحة ومترجمة
- ✅ منع إدخال بيانات تالفة أو غير صالحة
- ✅ تجربة مستخدم محسنة مع feedback فوري
- ✅ حماية قاعدة البيانات من البيانات غير الصالحة
