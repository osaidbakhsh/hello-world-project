
# خطة شاملة لإصلاح مشاكل RTL في جميع أقسام التطبيق

---

## ملخص المشكلة

بناءً على فحص شامل للكود والصور المرفقة، تم اكتشاف مشاكل متعددة في دعم RTL (العربية) تشمل:

1. **محاذاة التبويبات (Tabs)**: التبويبات تبقى على اليسار بدلاً من اليمين في وضع RTL
2. **الأيقونات والنصوص**: ترتيب خاطئ للأيقونات مع النصوص
3. **الفراغات (Spacing)**: استخدام `ml-`/`mr-` بدلاً من `ms-`/`me-`
4. **الحوارات (Dialogs)**: عدم تطبيق `dir={dir}` على DialogContent
5. **الجداول**: محاذاة خاطئة للأعمدة والخلايا
6. **البطاقات (Cards)**: محاذاة عناصر داخلية غير صحيحة

---

## الملفات المطلوب تعديلها

### المرحلة 1: مكونات Datacenter (الأولوية العالية)

| الملف | المشاكل | الإصلاحات |
|-------|---------|-----------|
| `DatacenterOverview.tsx` | محاذاة بطاقات الكلسترات، الأيقونات | إضافة RTL-aware classes |
| `ClusterTable.tsx` | Dialog بدون dir، الجدول | إضافة `dir={dir}` |
| `DatacenterTable.tsx` | DropdownMenu محاذاة، Dialog | تصحيح align و dir |
| `NodeTable.tsx` | Dialog و DropdownMenu | إضافة RTL classes |
| `VMTable.tsx` | Dialog و DropdownMenu | إضافة RTL classes |
| `TopologyView.tsx` | عناصر الشجرة، borders | تصحيح `ps-`/`pe-` و borders |
| `ClusterForm.tsx` | Dialog محاذاة | إضافة `dir={dir}` |
| `DatacenterForm.tsx` | Dialog محاذاة | إضافة `dir={dir}` |

### المرحلة 2: الصفحات الرئيسية

| الملف | المشاكل | الإصلاحات |
|-------|---------|-----------|
| `Servers.tsx` | Dialog، Table، Filters | إضافة RTL classes |
| `Networks.tsx` | Tabs، Dialog، Cards | تصحيح محاذاة التبويبات |
| `Licenses.tsx` | Tabs، Dialog، Table | إضافة RTL support |
| `Tasks.tsx` | Tabs، Dialog، Kanban | تصحيح محاذاة |
| `Vacations.tsx` | Dialog، Table | إضافة dir |
| `MaintenanceWindows.tsx` | Tabs، Dialog، Calendar | RTL alignment |
| `OnCallSchedule.tsx` | Tabs، Dialog، Cards | RTL alignment |
| `FileShares.tsx` | Dialog، Table | RTL classes |
| `NetworkScan.tsx` | Tabs، Dialog، Table | RTL alignment |
| `Settings.tsx` | Tabs، Forms | RTL alignment |
| `WebApps.tsx` | Dialog (تم إصلاحه جزئياً) | تحسينات إضافية |
| `Vault.tsx` | Tabs، Cards | RTL alignment |

### المرحلة 3: المكونات المشتركة

| الملف | المشاكل | الإصلاحات |
|-------|---------|-----------|
| `VaultItemCard.tsx` | Badge positions، icons | RTL positions |
| `FileShareForm.tsx` | Form layout | RTL form alignment |
| `VaultItemForm.tsx` | (تم إصلاحه جزئياً) | تحسينات إضافية |
| `KanbanBoard.tsx` | Card layout | RTL support |
| `TaskCalendar.tsx` | Calendar direction | RTL calendar |

---

## التغييرات التقنية المطلوبة

### 1. إضافة dir للـ Dialogs

```typescript
// قبل
<DialogContent className="max-w-2xl">

// بعد  
<DialogContent className="max-w-2xl" dir={dir}>
```

### 2. تصحيح الـ Spacing Classes

```typescript
// قبل - hardcoded direction
className="ml-2"  // left margin
className="mr-2"  // right margin
className="pl-4"  // left padding
className="pr-4"  // right padding

// بعد - RTL-aware
className="ms-2"  // margin-start
className="me-2"  // margin-end
className="ps-4"  // padding-start
className="pe-4"  // padding-end
```

### 3. تصحيح محاذاة التبويبات

```typescript
// إضافة wrapper للتحكم في المحاذاة
<div className={language === 'ar' ? 'flex justify-end' : 'flex justify-start'}>
  <TabsList>
    {/* ... tabs */}
  </TabsList>
</div>
```

### 4. تصحيح DropdownMenu Alignment

```typescript
// قبل
<DropdownMenuContent align="end">

// بعد
<DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'}>
```

### 5. تصحيح Border Directions

```typescript
// قبل
className="border-l"  // left border
className="border-r"  // right border

// بعد
className={dir === 'rtl' ? 'border-r' : 'border-l'}
// أو استخدام Tailwind logical properties
className="border-s"  // border-start
className="border-e"  // border-end
```

### 6. تصحيح الأيقونات مع النصوص

```typescript
// قبل
<Button>
  <Icon className="mr-2" />
  {text}
</Button>

// بعد
<Button className={dir === 'rtl' ? 'flex-row-reverse' : ''}>
  <Icon className="me-2" />
  {text}
</Button>
```

### 7. تصحيح محاذاة العناصر في Cards

```typescript
// قبل
<div className="flex items-start justify-between">
  <div>{content}</div>
  <Badge>{status}</Badge>
</div>

// بعد - يعمل تلقائياً مع RTL
// لكن تأكد من استخدام ms-/me- بدلاً من ml-/mr-
```

---

## قائمة الإصلاحات التفصيلية

### DatacenterOverview.tsx
- [ ] إضافة `text-start` للعناوين
- [ ] تصحيح `flex justify-between` للبطاقات
- [ ] استخدام `ms-` بدلاً من `ml-` للـ Badges
- [ ] تصحيح `flex gap-1` في أزرار الإجراءات

### ClusterTable.tsx
- [ ] إضافة `dir={dir}` للـ Dialog
- [ ] تصحيح محاذاة الجدول
- [ ] تصحيح DialogFooter alignment

### DatacenterTable.tsx
- [ ] إضافة `dir={dir}` للـ Dialog
- [ ] تصحيح DropdownMenu align
- [ ] تصحيح search input icon position

### TopologyView.tsx
- [ ] تصحيح `ps-` و borders للعناصر الشجرية
- [ ] تصحيح `text-start` للأزرار
- [ ] تصحيح badges position

### جميع الصفحات الرئيسية
- [ ] إضافة wrapper للـ TabsList مع conditional alignment
- [ ] إضافة `dir={dir}` لجميع Dialogs
- [ ] استبدال `ml-`/`mr-` بـ `ms-`/`me-`
- [ ] تصحيح search input icon positions
- [ ] تصحيح DropdownMenu alignments

---

## النتيجة المتوقعة

- تبويبات على اليمين في وضع RTL
- أيقونات على الجهة الصحيحة من النص
- فراغات متناسقة في كلا الاتجاهين
- حوارات محاذاة بشكل صحيح
- جداول قابلة للقراءة في RTL
- تجربة مستخدم احترافية للمستخدمين العرب

---

## ملاحظات التنفيذ

1. سيتم تعديل كل ملف على حدة
2. سيتم اختبار كل تغيير في وضعي LTR و RTL
3. سيتم الحفاظ على التوافق مع الكود الحالي
4. الأولوية لصفحة Datacenter ثم باقي الصفحات
