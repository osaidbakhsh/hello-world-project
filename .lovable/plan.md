
# خطة إصلاح مُولّد البيانات التجريبية

---

## 1. تشخيص السبب الجذري

### المشكلة المكتشفة:

| الحقل | القيمة المُستخدمة في الكود | القيم المسموحة في قاعدة البيانات |
|-------|---------------------------|--------------------------------|
| `cluster_type` | `'hyper-v'` (مع شَرطة) | `['nutanix', 'vmware', 'hyperv', 'other']` |
| `rf_level` | `'RF2'` (صحيح) | `['RF2', 'RF3']` فقط |

**السبب الجذري**: في ملف `src/utils/seedData.ts` السطر 449، الكود يستخدم `'hyper-v'` بينما قاعدة البيانات تتوقع `'hyperv'` بدون شَرطة.

### مواقع الملفات:

```
src/pages/Settings.tsx          → واجهة المستخدم (أسطر 648-691)
src/utils/seedData.ts           → منطق التوليد (1517 سطر)
src/types/datacenter.ts         → تعريفات الأنواع
```

---

## 2. التغييرات المطلوبة

### أ) إصلاح `src/utils/seedData.ts`

1. **إضافة ثوابت مركزية للقيم المسموحة:**

```typescript
// Database constraint mappings
const ALLOWED_VALUES = {
  cluster_type: ['nutanix', 'vmware', 'hyperv', 'other'] as const,
  rf_level: ['RF2', 'RF3'] as const,
  storage_type: ['all-flash', 'hybrid', 'hdd'] as const,
  node_role: ['compute', 'storage', 'hybrid'] as const,
  node_status: ['active', 'maintenance', 'decommissioned'] as const,
} as const;
```

2. **تصحيح بيانات الكلستر:**

```typescript
// قبل (خطأ)
{ 
  datacenterName: 'DC-DAMMAM-01', 
  name: 'IS-HYPERV-SEC', 
  cluster_type: 'hyper-v',  // ❌
  ...
}

// بعد (صحيح)
{ 
  datacenterName: 'DC-DAMMAM-01', 
  name: 'IS-HYPERV-SEC', 
  cluster_type: 'hyperv',  // ✅
  rf_level: null,  // VMware/Hyper-V لا يستخدم RF
  ...
}
```

3. **إضافة دالة التحقق قبل الإدراج:**

```typescript
function validateClusterData(cluster: any): string[] {
  const errors: string[] = [];
  
  if (cluster.cluster_type && !ALLOWED_VALUES.cluster_type.includes(cluster.cluster_type)) {
    errors.push(`Invalid cluster_type: '${cluster.cluster_type}'. Allowed: ${ALLOWED_VALUES.cluster_type.join(', ')}`);
  }
  
  if (cluster.rf_level && !ALLOWED_VALUES.rf_level.includes(cluster.rf_level)) {
    errors.push(`Invalid rf_level: '${cluster.rf_level}'. Allowed: ${ALLOWED_VALUES.rf_level.join(', ')}`);
  }
  
  if (cluster.storage_type && !ALLOWED_VALUES.storage_type.includes(cluster.storage_type)) {
    errors.push(`Invalid storage_type: '${cluster.storage_type}'. Allowed: ${ALLOWED_VALUES.storage_type.join(', ')}`);
  }
  
  return errors;
}
```

4. **تحسين رسائل الخطأ:**

```typescript
// بدلاً من:
if (clusterError) throw new Error(`Failed to create clusters: ${clusterError.message}`);

// استخدام:
if (clusterError) {
  const invalidCluster = newClusters.find(c => 
    !ALLOWED_VALUES.cluster_type.includes(c.cluster_type as any)
  );
  throw new Error(
    `Failed to create clusters: ${clusterError.message}\n` +
    `Invalid data: ${JSON.stringify(invalidCluster, null, 2)}\n` +
    `Allowed cluster_type: ${ALLOWED_VALUES.cluster_type.join(', ')}`
  );
}
```

### ب) تحسين `src/pages/Settings.tsx`

1. **تحسين التسميات:**

```typescript
// تغيير النص من "البيانات التجريبية" إلى نص أوضح
<CardTitle>
  <Database className="w-5 h-5" />
  {language === 'ar' ? 'البيانات التجريبية' : 'Demo Data Generator'}
</CardTitle>
<CardDescription>
  {language === 'ar' 
    ? 'إنشاء بيانات تجريبية للاختبار فقط. يمكن إعادة تعيينها لاحقاً.' 
    : 'Creates demo data for testing only. Can be reset later.'}
</CardDescription>
```

---

## 3. تفاصيل الإصلاحات

### جدول البيانات التجريبية المُصحّحة:

| اسم الكلستر | cluster_type | rf_level | storage_type |
|-------------|--------------|----------|--------------|
| OS-NUTANIX-PROD | `nutanix` ✅ | `RF2` ✅ | `hybrid` ✅ |
| OS-NUTANIX-DR | `nutanix` ✅ | `RF2` ✅ | `all-flash` ✅ |
| AT-VMWARE-PROD | `vmware` ✅ | `null` | `all-flash` ✅ |
| IS-HYPERV-SEC | `hyperv` ✅ (كان `hyper-v`) | `null` | `hybrid` ✅ |

### تسلسل إنشاء البيانات:

```
1. Domains (3)
   ↓
2. Networks (6 - 2 per domain)
   ↓
3. Servers (21)
   ↓
4. Datacenters (3 - 1 per domain)
   ↓
5. Clusters (4)
   ↓
6. Cluster Nodes (14)
   ↓
7. Maintenance Windows
   ↓
8. On-Call Schedules
   ↓
9. File Shares
   ↓
10. Vacations
   ↓
11. Licenses
   ↓
12. Tasks
   ↓
13. Web Applications
   ↓
14. Vault Items
   ↓
15. Scan Agents
```

---

## 4. الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/utils/seedData.ts` | تصحيح `cluster_type: 'hyper-v'` → `'hyperv'` + إضافة validation + تحسين الأخطاء |
| `src/pages/Settings.tsx` | تحسين الوصف والتسميات |

---

## 5. النتيجة المتوقعة بعد الإصلاح

**عند الضغط على "إنشاء بيانات تجريبية":**

- **Domains**: 3 (os.com, at.com, is.com)
- **Networks**: 6
- **Servers**: 21
- **Datacenters**: 3
- **Clusters**: 4
- **Cluster Nodes**: 14
- **Maintenance Windows**: 4
- **On-Call Schedules**: 3
- **File Shares**: 6
- **Vacations**: (حسب المستخدم)
- **Licenses**: 10
- **Tasks**: 8
- **Web Applications**: 10
- **Vault Items**: 12
- **Scan Agents**: 4

**الحالة**: ✅ PASS

**إعادة التعيين**: تحذف فقط البيانات المُنشأة بواسطة المستخدم الحالي (لا تمس بيانات المستخدمين الآخرين)
