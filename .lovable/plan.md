
# خطة إصلاح التعديل في المناوبات (On-Call Schedule)

---

## المشكلة

زر التعديل موجود في واجهة المستخدم لكنه **لا يعمل** لأنه:
- لا يوجد `onClick` handler
- لا يوجد dialog للتعديل
- لا يوجد mutation لتحديث البيانات في قاعدة البيانات

---

## الحل

### 1. إضافة State للتعديل

```typescript
// بعد السطر 72
const [editingSchedule, setEditingSchedule] = useState<OnCallSchedule | null>(null);
const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
```

---

### 2. إضافة Update Mutation

```typescript
// بعد deleteScheduleMutation (السطر 164)
const updateScheduleMutation = useMutation({
  mutationFn: async (schedule: { 
    id: string; 
    name: string; 
    domain_id: string | null;
    rotation_type: string; 
    team_members: string[];
    is_active: boolean;
  }) => {
    const { data, error } = await supabase
      .from('on_call_schedules')
      .update({
        name: schedule.name,
        domain_id: schedule.domain_id,
        rotation_type: schedule.rotation_type,
        team_members: schedule.team_members,
        is_active: schedule.is_active,
      })
      .eq('id', schedule.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['on_call_schedules'] });
    toast.success(t('common.saved'));
    setIsEditDialogOpen(false);
    setEditingSchedule(null);
  },
  onError: (error) => {
    toast.error(t('common.error'));
    console.error(error);
  },
});
```

---

### 3. إضافة Dialog للتعديل

```tsx
{/* Edit Dialog - يضاف بعد Add Dialog */}
<Dialog open={isEditDialogOpen} onOpenChange={(open) => {
  setIsEditDialogOpen(open);
  if (!open) setEditingSchedule(null);
}}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>{t('onCall.editSchedule')}</DialogTitle>
    </DialogHeader>
    {editingSchedule && (
      <div className="space-y-4">
        <div>
          <Label>{t('common.name')}</Label>
          <Input
            value={editingSchedule.name}
            onChange={(e) => setEditingSchedule(prev => prev ? { ...prev, name: e.target.value } : null)}
          />
        </div>
        <div>
          <Label>{t('nav.domains')}</Label>
          <Select 
            value={editingSchedule.domain_id || ''} 
            onValueChange={(value) => setEditingSchedule(prev => prev ? { ...prev, domain_id: value || null } : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('domainSummary.selectDomain')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('common.none')}</SelectItem>
              {domains?.map(domain => (
                <SelectItem key={domain.id} value={domain.id}>
                  {domain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t('onCall.rotationType')}</Label>
          <Select 
            value={editingSchedule.rotation_type} 
            onValueChange={(value) => setEditingSchedule(prev => prev ? { ...prev, rotation_type: value } : null)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">{t('onCall.daily')}</SelectItem>
              <SelectItem value="weekly">{t('onCall.weekly')}</SelectItem>
              <SelectItem value="biweekly">{t('onCall.biweekly')}</SelectItem>
              <SelectItem value="monthly">{t('onCall.monthly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t('onCall.teamMembers')}</Label>
          <Select onValueChange={(profileId) => {
            if (editingSchedule && !editingSchedule.team_members?.includes(profileId)) {
              setEditingSchedule(prev => prev ? { 
                ...prev, 
                team_members: [...(prev.team_members || []), profileId] 
              } : null);
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder={t('onCall.selectMember')} />
            </SelectTrigger>
            <SelectContent>
              {profiles?.filter(p => !editingSchedule.team_members?.includes(p.id)).map(profile => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 mt-2">
            {editingSchedule.team_members?.map((memberId, index) => {
              const profile = getProfile(memberId);
              return (
                <Badge key={memberId} variant="secondary" className="gap-1">
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  {profile?.full_name}
                  <button
                    onClick={() => setEditingSchedule(prev => prev ? {
                      ...prev,
                      team_members: prev.team_members?.filter(id => id !== memberId) || []
                    } : null)}
                    className="ms-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label>{t('common.status')}</Label>
          <Button
            variant={editingSchedule.is_active ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEditingSchedule(prev => prev ? { ...prev, is_active: !prev.is_active } : null)}
          >
            {editingSchedule.is_active ? t('common.active') : t('common.inactive')}
          </Button>
        </div>
        <Button 
          className="w-full" 
          onClick={() => editingSchedule && updateScheduleMutation.mutate({
            id: editingSchedule.id,
            name: editingSchedule.name,
            domain_id: editingSchedule.domain_id,
            rotation_type: editingSchedule.rotation_type,
            team_members: editingSchedule.team_members || [],
            is_active: editingSchedule.is_active,
          })}
          disabled={!editingSchedule.name || !editingSchedule.team_members?.length}
        >
          {t('common.save')}
        </Button>
      </div>
    )}
  </DialogContent>
</Dialog>
```

---

### 4. تفعيل زر التعديل

تغيير السطر 387:

```tsx
// من:
<Button variant="ghost" size="icon" className="h-8 w-8">
  <Edit className="w-4 h-4" />
</Button>

// إلى:
<Button 
  variant="ghost" 
  size="icon" 
  className="h-8 w-8"
  onClick={() => {
    setEditingSchedule(schedule);
    setIsEditDialogOpen(true);
  }}
>
  <Edit className="w-4 h-4" />
</Button>
```

---

### 5. إضافة مفتاح الترجمة

في `src/contexts/LanguageContext.tsx`:

**العربية:**
```typescript
'onCall.editSchedule': 'تعديل جدول المناوبة',
```

**الإنجليزية:**
```typescript
'onCall.editSchedule': 'Edit Schedule',
```

---

## ملخص الملفات المطلوب تعديلها

| الملف | التغييرات |
|-------|----------|
| `src/pages/OnCallSchedule.tsx` | إضافة state للتعديل، mutation للتحديث، dialog للتعديل، تفعيل onClick على زر Edit |
| `src/contexts/LanguageContext.tsx` | إضافة `onCall.editSchedule` |

---

## النتيجة المتوقعة

- الضغط على زر ✏️ يفتح dialog لتعديل الجدول
- يمكن تغيير الاسم، الدومين، نوع التدوير، أعضاء الفريق، والحالة
- حفظ التغييرات يحدث قاعدة البيانات فوراً
- الواجهة تتحدث تلقائياً بعد الحفظ

