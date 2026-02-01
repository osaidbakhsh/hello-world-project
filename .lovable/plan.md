
# خطة إصلاح فلترة بيانات صفحة ملخص النطاق (Domain Summary)

## المشكلة الحالية

عند اختيار نطاق (Domain) في صفحة ملخص النطاق، لا تتغير البيانات المعروضة:
- إجمالي السيرفرات والسيرفرات النشطة تعرض بيانات كل النظام
- الأدوار الحرجة (DC, CA, DHCP, File Server, SQL) لا تتفلتر حسب الدومين
- حالة النسخ الاحتياطي تعرض بيانات عامة

## تحليل السبب الجذري

```text
العلاقة في قاعدة البيانات:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   domains   │ 1:N │  networks   │ 1:N │   servers   │
│   النطاق    │────▶│   الشبكة    │────▶│  السيرفر    │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                                       
       │ 1:N                                   
       │                                       
┌─────────────┐                               
│  licenses   │                               
│  التراخيص  │                               
└─────────────┘
```

في الكود الحالي (`DomainSummary.tsx` سطر 54-58):
```typescript
const domainServers = useMemo(() => {
  if (!selectedDomainId) return [];
  // Servers are linked via network_id -> networks.domain_id
  // For now, we'll show all servers (can be enhanced with network filtering)
  return allServers; // ← هنا المشكلة: يرجع كل السيرفرات!
}, [allServers, selectedDomainId]);
```

---

## خطة الحل

### 1. إضافة هوك جديد لجلب الشبكات حسب الدومين

إنشاء hook يجلب كل الشبكات مع معرفات النطاقات لاستخدامها في الفلترة.

### 2. تحديث منطق الفلترة في DomainSummary.tsx

```typescript
// جلب الشبكات
const { data: allNetworks } = useNetworks();

// فلترة السيرفرات حسب الدومين المحدد
const domainServers = useMemo(() => {
  if (!selectedDomainId || !allNetworks.length) return [];
  
  // الحصول على معرفات الشبكات المرتبطة بالدومين
  const domainNetworkIds = allNetworks
    .filter(n => n.domain_id === selectedDomainId)
    .map(n => n.id);
  
  // فلترة السيرفرات التي تنتمي لهذه الشبكات
  return allServers.filter(s => 
    s.network_id && domainNetworkIds.includes(s.network_id)
  );
}, [allServers, allNetworks, selectedDomainId]);
```

### 3. الملفات المطلوب تعديلها

| الملف | التعديل |
|-------|---------|
| `src/pages/DomainSummary.tsx` | إضافة useNetworks وتحديث منطق الفلترة |
| `src/components/domain-summary/CriticalRolesCard.tsx` | التحقق من استقبال السيرفرات المفلترة (لا يحتاج تعديل) |
| `src/components/domain-summary/BackupStatusCard.tsx` | التحقق من استقبال السيرفرات المفلترة (لا يحتاج تعديل) |

---

## التفاصيل التقنية

### تعديل DomainSummary.tsx

```typescript
// إضافة استيراد useNetworks
import { 
  useDomains, 
  useServers, 
  useLicenses, 
  useTasks,
  useProfiles,
  useNetworks  // ← إضافة
} from '@/hooks/useSupabaseData';

// داخل المكون
const { data: allNetworks } = useNetworks(); // ← إضافة

// تحديث domainServers
const domainServers = useMemo(() => {
  if (!selectedDomainId) return [];
  
  // الحصول على معرفات الشبكات المرتبطة بهذا الدومين
  const domainNetworkIds = allNetworks
    .filter(network => network.domain_id === selectedDomainId)
    .map(network => network.id);
  
  // فلترة السيرفرات التي تنتمي لشبكات هذا الدومين
  return allServers.filter(server => 
    server.network_id && domainNetworkIds.includes(server.network_id)
  );
}, [allServers, allNetworks, selectedDomainId]);

// تحديث domainTasks - ربط المهام بالسيرفرات في الدومين
const domainTasks = useMemo(() => {
  if (!selectedDomainId) return [];
  
  const domainServerIds = domainServers.map(s => s.id);
  
  // فلترة المهام المرتبطة بسيرفرات هذا الدومين
  return allTasks.filter(task => {
    // المهام المرتبطة بسيرفر في الدومين
    if (task.server_id && domainServerIds.includes(task.server_id)) {
      return true;
    }
    // المهام المرتبطة بـ linked_server_id
    if ((task as any).linked_server_id && 
        domainServerIds.includes((task as any).linked_server_id)) {
      return true;
    }
    // المهام المرتبطة بـ linked_network_id
    const domainNetworkIds = allNetworks
      .filter(n => n.domain_id === selectedDomainId)
      .map(n => n.id);
    if ((task as any).linked_network_id && 
        domainNetworkIds.includes((task as any).linked_network_id)) {
      return true;
    }
    return false;
  });
}, [allTasks, domainServers, allNetworks, selectedDomainId]);
```

---

## النتيجة المتوقعة

بعد التنفيذ:

| العنصر | قبل | بعد |
|--------|-----|-----|
| إجمالي السيرفرات | 23 (كل النظام) | 10 (الدومين المحدد فقط) |
| السيرفرات النشطة | 21 (كل النظام) | 9 (الدومين المحدد فقط) |
| الأدوار الحرجة | كل السيرفرات | سيرفرات الدومين فقط |
| حالة النسخ الاحتياطي | كل السيرفرات | سيرفرات الدومين فقط |
| التراخيص | تعمل صحيح ✓ | تعمل صحيح ✓ |

عند تبديل الدومين من `osaidtest1.com` إلى `osaidtest2.com`، ستتغير كل البطاقات والإحصائيات لتعكس بيانات الدومين الجديد فقط.
