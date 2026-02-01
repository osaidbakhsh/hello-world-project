
# خطة إصلاح شريط التمرير في القائمة الجانبية

## المشكلة
القائمة الجانبية تستخدم `overflow-y-auto` الذي يظهر شريط تمرير المتصفح الافتراضي. هذا الشريط لا يتناسب مع تصميم القائمة الجانبية الداكنة ويبدو غير متناسق.

## الحل
استخدام مكون `ScrollArea` من Radix UI الموجود في المشروع، مع تخصيص ألوانه لتتناسب مع القائمة الجانبية.

---

## التغييرات المطلوبة

### 1. تحديث ملف Sidebar.tsx

**إضافة استيراد ScrollArea:**
```typescript
import { ScrollArea } from '@/components/ui/scroll-area';
```

**استبدال nav element:**

من:
```tsx
<nav className="flex-1 py-4 px-2 overflow-y-auto">
  <ul className="space-y-1">
    ...
  </ul>
</nav>
```

إلى:
```tsx
<ScrollArea className="flex-1">
  <nav className="py-4 px-2">
    <ul className="space-y-1">
      ...
    </ul>
  </nav>
</ScrollArea>
```

### 2. تحديث ملف scroll-area.tsx

**تخصيص لون الشريط ليتناسب مع الـ Sidebar:**

```tsx
<ScrollAreaPrimitive.ScrollAreaThumb 
  className="relative flex-1 rounded-full bg-border dark:bg-sidebar-border/50 hover:bg-muted-foreground/30" 
/>
```

**أو إضافة variant للـ sidebar:**

```tsx
// خيار بديل: إضافة prop للتخصيص
<ScrollAreaPrimitive.ScrollAreaThumb 
  className={cn(
    "relative flex-1 rounded-full bg-border",
    "hover:bg-muted-foreground/50 transition-colors"
  )} 
/>
```

---

## النتيجة المتوقعة

| قبل | بعد |
|-----|-----|
| شريط تمرير المتصفح الافتراضي | شريط تمرير مخصص متناسق |
| لون فاتح يتعارض مع الخلفية الداكنة | لون داكن شفاف يتناسب مع التصميم |
| عرض ثابت وغير قابل للتخصيص | عرض رفيع (2.5) مع تأثير hover |

---

## الملفات المتأثرة

1. `src/components/layout/Sidebar.tsx` - استخدام ScrollArea
2. `src/components/ui/scroll-area.tsx` - تحسين الألوان (اختياري)
