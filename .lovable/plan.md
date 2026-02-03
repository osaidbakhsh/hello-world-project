

# Implementation Plan: Advanced Settings Toggle + Vault Cleanup

---

## Phase 1: Settings Tabs Layout Fix (Immediate)

### 1.1 Add State and Persistence for Advanced Toggle

**File:** `src/pages/Settings.tsx`

Add state after line 46:
```typescript
const [showAdvanced, setShowAdvanced] = useState(false);
```

Add effect to load setting (after line 123):
```typescript
useEffect(() => {
  const loadAdvancedSetting = async () => {
    const value = await getSetting('show_advanced_settings');
    setShowAdvanced(value === 'true');
  };
  loadAdvancedSetting();
}, [getSetting]);
```

### 1.2 Define Tabs Configuration Array

Add before return statement (around line 420):
```typescript
const allTabs = [
  { value: 'general', icon: SettingsIcon, labelKey: 'settings.general', advanced: false },
  { value: 'customization', icon: LayoutDashboard, labelKey: 'settings.customization', advanced: false },
  { value: 'mail', icon: Mail, labelKey: 'settings.mail', advanced: false },
  { value: 'ldap', icon: Shield, labelKey: 'settings.ldap', advanced: true },
  { value: 'ntp', icon: Clock, labelKey: 'settings.ntp', advanced: true },
  { value: 'https', icon: Lock, labelKey: 'settings.https', advanced: false },
  { value: 'templates', icon: FileSpreadsheet, labelKey: 'settings.templates', advanced: false },
];

const visibleTabs = allTabs.filter(tab => !tab.advanced || showAdvanced);
```

### 1.3 Update Header with Toggle Switch

Replace header section (lines 425-434) with:
```tsx
<div className="flex items-center justify-between flex-wrap gap-4">
  <div className="flex items-center gap-3">
    <div className="p-3 rounded-xl bg-primary/10">
      <SettingsIcon className="w-6 h-6 text-primary" />
    </div>
    <div>
      <h1 className="text-3xl font-bold">{t('nav.settings')}</h1>
      <p className="text-muted-foreground">{t('settings.manageSettings')}</p>
    </div>
  </div>
  
  {/* Advanced Settings Toggle - RTL aware */}
  <div className={cn(
    "flex items-center gap-2",
    dir === 'rtl' && 'flex-row-reverse'
  )}>
    <Label htmlFor="advanced-toggle" className="text-sm text-muted-foreground cursor-pointer">
      {t('settings.showAdvanced')}
    </Label>
    <Switch
      id="advanced-toggle"
      checked={showAdvanced}
      onCheckedChange={async (checked) => {
        setShowAdvanced(checked);
        await updateSetting('show_advanced_settings', String(checked));
      }}
    />
  </div>
</div>
```

### 1.4 Replace Static Grid with Flexbox Tabs

Replace TabsList (lines 437-466) with:
```tsx
<TabsList className="flex flex-wrap justify-start gap-1 h-auto p-1 w-full">
  {visibleTabs.map(tab => (
    <TabsTrigger 
      key={tab.value} 
      value={tab.value} 
      className="gap-2 flex-shrink-0"
    >
      <tab.icon className="w-4 h-4" />
      <span className="hidden sm:inline">{t(tab.labelKey)}</span>
    </TabsTrigger>
  ))}
</TabsList>
```

---

## Phase 2: Add Translation Key

**File:** `src/contexts/LanguageContext.tsx`

Add after line 90 (Arabic section):
```typescript
'settings.showAdvanced': 'إظهار الإعدادات المتقدمة',
```

Add in English section (around line 2690):
```typescript
'settings.showAdvanced': 'Show advanced settings',
```

---

## Phase 3: Drop Legacy Vault Columns (After User Confirmation)

### 3.1 Database Migration SQL

```sql
-- Phase 3: Remove legacy sensitive columns from vault_items
-- All secrets now live in vault_item_secrets table

-- Safety check: verify no orphaned items with legacy data
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM vault_items vi
  WHERE (
    vi.username IS NOT NULL 
    OR vi.password_encrypted IS NOT NULL 
    OR vi.password_iv IS NOT NULL 
    OR vi.notes IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM vault_item_secrets vis 
    WHERE vis.vault_item_id = vi.id
  );
  
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Found % vault items with legacy data but no secrets record. Run vault-migrate-secrets first.', orphan_count;
  END IF;
END $$;

-- Drop legacy columns
ALTER TABLE vault_items 
  DROP COLUMN IF EXISTS username,
  DROP COLUMN IF EXISTS password_encrypted,
  DROP COLUMN IF EXISTS password_iv,
  DROP COLUMN IF EXISTS notes;

-- Add audit comment
COMMENT ON TABLE vault_items IS 'Vault metadata only. Sensitive fields removed 2026-02-03, now in vault_item_secrets.';
```

### 3.2 Frontend Cleanup (After Migration)

**File:** `src/hooks/useVaultData.ts` - Remove lines 21-25:
```typescript
// REMOVE these legacy fields from VaultItem interface:
// username?: string | null;
// notes?: string | null;
// password_encrypted?: string | null;
// password_iv?: string | null;
```

**File:** `src/components/vault/VaultItemCard.tsx` - Remove lines 93-98:
```tsx
// REMOVE this block:
// {item.username && (
//   <p className="text-sm text-muted-foreground truncate">
//     <User className="inline w-3 h-3 me-1" />
//     {item.username}
//   </p>
// )}
```

**File:** `src/components/vault/VaultItemCard.tsx` - Update line 145:
```tsx
// CHANGE from:
hasPassword={!!item.password_encrypted || true}
// TO:
hasPassword={true}
```

---

## Phase 4: Final Verification Report (After Phase 3)

### Expected vault_items Columns

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| title | text | Item name |
| url | text | URL/link |
| item_type | text | Category |
| linked_server_id | uuid | FK to servers |
| linked_network_id | uuid | FK to networks |
| linked_application_id | uuid | FK to web_apps |
| tags | ARRAY | Labels |
| owner_id | uuid | Owner (enforced) |
| requires_2fa_reveal | boolean | 2FA requirement |
| last_password_reveal | timestamp | Last reveal time |
| password_reveal_count | integer | Reveal counter |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Update time |
| created_by | uuid | Creator |

**REMOVED**: username, password_encrypted, password_iv, notes

### Final Test Matrix

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 1 | vault_items schema | No username/password_encrypted/password_iv/notes | PENDING |
| 2 | view_metadata API query | Returns only title/type/url/tags | PENDING |
| 3 | Super admin lists vault_items | Only sees own items | PENDING |
| 4 | Super admin decrypts unshared | 403 Forbidden | PENDING |
| 5 | view_metadata decrypts | 403 Forbidden | PENDING |
| 6 | view_secret decrypts | Allowed | PENDING |
| 7 | Share creation | Owner only | PENDING |
| 8 | Revocation | Immediate effect | PENDING |
| 9 | Audit logs | Owner-only visibility | PENDING |

---

## Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| `src/pages/Settings.tsx` | 1 | Add toggle, flexbox tabs, persistence |
| `src/contexts/LanguageContext.tsx` | 2 | Add `settings.showAdvanced` (AR + EN) |
| Database Migration | 3 | Drop legacy columns (after confirmation) |
| `src/hooks/useVaultData.ts` | 3 | Remove legacy interface fields |
| `src/components/vault/VaultItemCard.tsx` | 3 | Remove username display, fix hasPassword |

---

## Execution Order

1. **Now**: Implement Phase 1 + 2 (Settings toggle with flexbox tabs)
2. **User Action**: Confirm Vault UI reveal/sharing works correctly
3. **After Confirmation**: Execute Phase 3 (database migration + frontend cleanup)
4. **Final**: Run verification and update PASS/FAIL matrix

