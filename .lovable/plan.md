
# Implementation Plan: Credentials Vault Module

## Overview

A secure internal IT credentials vault inspired by Bitwarden/KeePass UX. This module provides secure storage for server passwords, API keys, network device credentials, and application logins with role-based access control and comprehensive audit logging.

---

## Architecture Summary

```text
+------------------+     +-------------------+     +--------------------+
|   Vault UI       | --> | Backend Functions | --> | PostgreSQL + pgcrypto |
| (React + Radix)  |     | (Deno Edge Fn)    |     | (AES-256-GCM)         |
+------------------+     +-------------------+     +--------------------+
        |                         |
        v                         v
+------------------+     +-------------------+
| Audit Logging    |     | RLS Policies      |
+------------------+     +-------------------+
```

---

## Phase 1: Database Schema

### 1.1 Vault Roles Enum

```sql
-- Vault-specific roles (separate from app_role)
CREATE TYPE public.vault_role AS ENUM ('vault_admin', 'vault_editor', 'vault_viewer');
```

### 1.2 Vault Items Table

```sql
CREATE TABLE public.vault_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core fields
  title TEXT NOT NULL,
  username TEXT,
  password_encrypted BYTEA, -- AES-256-GCM encrypted
  password_iv BYTEA,        -- Initialization vector for decryption
  url TEXT,
  item_type TEXT NOT NULL DEFAULT 'other',
  
  -- Linked entities (optional)
  linked_server_id UUID REFERENCES servers(id) ON DELETE SET NULL,
  linked_network_id UUID REFERENCES networks(id) ON DELETE SET NULL,
  linked_application_id UUID REFERENCES website_applications(id) ON DELETE SET NULL,
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  
  -- Security
  requires_2fa_reveal BOOLEAN DEFAULT FALSE,
  last_password_reveal TIMESTAMPTZ,
  password_reveal_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  CONSTRAINT valid_item_type CHECK (item_type IN ('server', 'website', 'network_device', 'application', 'api_key', 'other'))
);
```

### 1.3 Vault Permissions Table

```sql
CREATE TABLE public.vault_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id UUID REFERENCES vault_items(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  can_view BOOLEAN DEFAULT FALSE,
  can_reveal BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  UNIQUE (vault_item_id, profile_id)
);
```

### 1.4 Vault Audit Log Table

```sql
CREATE TABLE public.vault_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id UUID REFERENCES vault_items(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  user_email TEXT,
  action TEXT NOT NULL, -- 'view_metadata', 'reveal_password', 'create', 'update', 'delete', 'copy_password'
  ip_address TEXT,
  user_agent TEXT,
  details JSONB, -- Redacted details (never store passwords)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.5 Vault Settings Table

```sql
CREATE TABLE public.vault_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO vault_settings (key, value) VALUES 
  ('reveal_duration_seconds', '10'),
  ('auto_lock_minutes', '5'),
  ('global_reveal_disabled', 'false'),
  ('require_2fa_for_reveal', 'false');
```

### 1.6 Enable RLS on All Vault Tables

```sql
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_settings ENABLE ROW LEVEL SECURITY;
```

---

## Phase 2: RLS Policies

### 2.1 Security Helper Functions

```sql
-- Check if user has vault permission
CREATE OR REPLACE FUNCTION public.has_vault_permission(
  _vault_item_id UUID, 
  _permission TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault_permissions vp
    JOIN profiles p ON p.id = vp.profile_id
    WHERE p.user_id = auth.uid() 
      AND vp.vault_item_id = _vault_item_id
      AND (
        (_permission = 'view' AND vp.can_view = TRUE) OR
        (_permission = 'reveal' AND vp.can_reveal = TRUE) OR
        (_permission = 'edit' AND vp.can_edit = TRUE)
      )
  )
$$;

-- Check if user owns vault item
CREATE OR REPLACE FUNCTION public.owns_vault_item(_vault_item_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault_items vi
    JOIN profiles p ON p.id = vi.owner_id
    WHERE vi.id = _vault_item_id AND p.user_id = auth.uid()
  )
$$;
```

### 2.2 RLS Policies for vault_items

```sql
-- Admins can do all
CREATE POLICY "Admins can do all on vault_items"
  ON vault_items FOR ALL
  USING (is_admin());

-- Owners can manage their items
CREATE POLICY "Owners can manage their vault items"
  ON vault_items FOR ALL
  USING (owner_id = get_my_profile_id());

-- Users with view permission can see items
CREATE POLICY "Users with view permission can see vault items"
  ON vault_items FOR SELECT
  USING (has_vault_permission(id, 'view'));
```

### 2.3 RLS Policies for vault_permissions

```sql
-- Admins can manage all permissions
CREATE POLICY "Admins can manage vault permissions"
  ON vault_permissions FOR ALL
  USING (is_admin());

-- Owners can manage permissions for their items
CREATE POLICY "Owners can manage permissions for their items"
  ON vault_permissions FOR ALL
  USING (owns_vault_item(vault_item_id));

-- Users can view their own permissions
CREATE POLICY "Users can view their permissions"
  ON vault_permissions FOR SELECT
  USING (profile_id = get_my_profile_id());
```

### 2.4 RLS Policies for vault_audit_logs

```sql
-- Only admins can view audit logs
CREATE POLICY "Admins can view vault audit logs"
  ON vault_audit_logs FOR SELECT
  USING (is_admin());

-- All authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert vault audit logs"
  ON vault_audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

---

## Phase 3: Edge Functions for Encryption

### 3.1 Vault Encryption Function

**File: `supabase/functions/vault-encrypt/index.ts`**

```text
Purpose: Encrypt passwords before storage using AES-256-GCM

Features:
1. Accepts plaintext password from authenticated request
2. Generates random IV (Initialization Vector)
3. Encrypts using AES-256-GCM with server-side key
4. Returns encrypted data + IV (NEVER returns or logs plaintext)
5. Validates caller is admin or owner of the vault item

Security:
- Encryption key stored in Supabase secrets (VAULT_ENCRYPTION_KEY)
- 32-byte key for AES-256
- 12-byte random IV per encryption
- GCM mode provides authentication

Implementation uses Web Crypto API available in Deno.
```

### 3.2 Vault Decryption Function

**File: `supabase/functions/vault-decrypt/index.ts`**

```text
Purpose: Decrypt password for authorized reveal

Features:
1. Accepts vault_item_id from authenticated request
2. Verifies user has 'reveal' permission or is owner/admin
3. Checks if global reveal is disabled (emergency lockout)
4. Decrypts password using stored IV
5. Logs the reveal action to vault_audit_logs
6. Returns decrypted password (one-time use in memory)

Security:
- NEVER logs decrypted value
- Increments password_reveal_count
- Updates last_password_reveal timestamp
- Returns password only to authorized caller
```

---

## Phase 4: UI Components

### 4.1 Vault Page

**File: `src/pages/Vault.tsx`**

```text
Features:
1. List view with search and filters:
   - Filter by type (Server, Website, Network Device, etc.)
   - Filter by owner
   - Filter by tags
   - Search by title, username, URL

2. Card/Table view toggle
3. "Add Credential" button (admins + editors only)
4. Warning banner: "Highly sensitive data - All access is logged"

Visual Elements:
- Lock icon for items user can't reveal
- Eye icon for items user can reveal
- Owner avatar/initials
- Tags as colored badges
- Last updated timestamp
```

### 4.2 Vault Item Card Component

**File: `src/components/vault/VaultItemCard.tsx`**

```text
Features:
1. Title and type icon
2. Username (visible)
3. Password field (masked: ••••••••)
4. Reveal button with countdown timer
5. Copy button (disabled if no reveal permission)
6. Edit button (if has edit permission)
7. Linked entity badge (Server/Network/App)

Password Reveal Flow:
1. Click "Reveal"
2. Optional: PIN/password confirmation dialog
3. Call vault-decrypt edge function
4. Display password for X seconds (configurable)
5. Auto-hide and clear from memory
6. Show "Copied to clipboard" toast if user clicks copy
7. Clear clipboard after 30 seconds
```

### 4.3 Vault Item Form Modal

**File: `src/components/vault/VaultItemForm.tsx`**

```text
Fields:
- Title (required)
- Username
- Password (with generate button)
- Confirm Password
- URL / System Name
- Type (dropdown: Server, Website, Network Device, Application, API Key, Other)
- Linked Server (optional dropdown)
- Linked Network (optional dropdown)
- Linked Application (optional dropdown)
- Notes (textarea with markdown preview)
- Tags (multi-select/input)
- Require 2FA for reveal (toggle)

Permissions Section (admin/owner only):
- Add user permission button
- List of users with permission checkboxes:
  - Can View (metadata only)
  - Can Reveal (see password)
  - Can Edit
```

### 4.4 Vault Settings Component

**File: `src/components/vault/VaultSettings.tsx`**

```text
Admin Settings:
1. Password reveal duration (seconds): 5, 10, 15, 30, 60
2. Auto-lock vault after inactivity (minutes): 1, 5, 10, 15, 30, never
3. Require 2FA for all reveals (global toggle)
4. Emergency: Disable all password reveals (panic button)

Each setting stored in vault_settings table.
```

### 4.5 Vault Audit Log Component

**File: `src/components/vault/VaultAuditLog.tsx`**

```text
Features:
1. List of vault-specific audit entries
2. Filter by action type
3. Filter by vault item
4. Filter by user
5. Date range picker

Columns:
- Timestamp
- User (name + email)
- Action (icon + label)
- Vault Item Title
- IP Address (if available)

Actions with icons:
- view_metadata: Eye icon (muted)
- reveal_password: Eye-off icon (warning)
- create: Plus icon (success)
- update: Edit icon (info)
- delete: Trash icon (destructive)
- copy_password: Copy icon (warning)
```

---

## Phase 5: Integration with Existing Pages

### 5.1 Server Page Integration

**File: `src/pages/Servers.tsx`**

```text
Changes:
1. Add "Related Credentials" section in server detail view
2. Show vault items linked to this server (metadata only)
3. "Add Credential for this Server" button
4. Click item → opens Vault detail modal (respects permissions)
```

### 5.2 Sidebar Navigation

**File: `src/components/layout/Sidebar.tsx`**

```text
Changes:
1. Add new menu item:
   { path: '/vault', icon: Lock, label: 'nav.vault', adminOnly: false }

Note: All users can access vault, but what they see depends on permissions.
Viewers see only items they have explicit permission for.
Admins see all items.
```

### 5.3 App Routes

**File: `src/App.tsx`**

```text
Changes:
1. Import Vault page
2. Add route: <Route path="/vault" element={<Vault />} />
```

---

## Phase 6: Translations (i18n)

**File: `src/contexts/LanguageContext.tsx`**

```typescript
// Arabic translations
'nav.vault': 'خزنة كلمات المرور',
'vault.title': 'خزنة البيانات الحساسة',
'vault.addCredential': 'إضافة بيانات اعتماد',
'vault.searchPlaceholder': 'بحث في الخزنة...',
'vault.itemTitle': 'العنوان',
'vault.username': 'اسم المستخدم',
'vault.password': 'كلمة المرور',
'vault.url': 'الرابط / اسم النظام',
'vault.type': 'النوع',
'vault.linkedServer': 'السيرفر المرتبط',
'vault.linkedNetwork': 'الشبكة المرتبطة',
'vault.linkedApplication': 'التطبيق المرتبط',
'vault.notes': 'ملاحظات',
'vault.tags': 'العلامات',
'vault.owner': 'المالك',
'vault.reveal': 'إظهار',
'vault.hide': 'إخفاء',
'vault.copy': 'نسخ',
'vault.copiedToClipboard': 'تم النسخ',
'vault.revealCountdown': 'سيختفي خلال {seconds} ثانية',
'vault.accessLogged': 'يتم تسجيل الوصول',
'vault.sensitiveData': 'بيانات حساسة جداً',
'vault.permissions': 'الصلاحيات',
'vault.canView': 'عرض البيانات',
'vault.canReveal': 'كشف كلمة المرور',
'vault.canEdit': 'تعديل',
'vault.noPermission': 'لا تملك صلاحية',
'vault.auditLog': 'سجل الوصول',
'vault.settings': 'إعدادات الخزنة',
'vault.revealDuration': 'مدة الإظهار (ثواني)',
'vault.autoLock': 'قفل تلقائي بعد (دقائق)',
'vault.require2FA': 'يتطلب مصادقة ثنائية',
'vault.emergencyLock': 'إيقاف طارئ لكشف كلمات المرور',
'vault.generatePassword': 'توليد كلمة مرور',
'vault.passwordStrength': 'قوة كلمة المرور',
'vault.weak': 'ضعيفة',
'vault.medium': 'متوسطة',
'vault.strong': 'قوية',
'vault.type.server': 'سيرفر',
'vault.type.website': 'موقع ويب',
'vault.type.network_device': 'جهاز شبكة',
'vault.type.application': 'تطبيق',
'vault.type.api_key': 'مفتاح API',
'vault.type.other': 'أخرى',
'vault.relatedCredentials': 'بيانات الاعتماد المرتبطة',
```

```typescript
// English translations
'nav.vault': 'Credentials Vault',
'vault.title': 'Credentials Vault',
'vault.addCredential': 'Add Credential',
'vault.searchPlaceholder': 'Search vault...',
'vault.itemTitle': 'Title',
'vault.username': 'Username',
'vault.password': 'Password',
'vault.url': 'URL / System Name',
'vault.type': 'Type',
'vault.linkedServer': 'Linked Server',
'vault.linkedNetwork': 'Linked Network',
'vault.linkedApplication': 'Linked Application',
'vault.notes': 'Notes',
'vault.tags': 'Tags',
'vault.owner': 'Owner',
'vault.reveal': 'Reveal',
'vault.hide': 'Hide',
'vault.copy': 'Copy',
'vault.copiedToClipboard': 'Copied to clipboard',
'vault.revealCountdown': 'Hiding in {seconds}s',
'vault.accessLogged': 'Access is logged',
'vault.sensitiveData': 'Highly Sensitive Data',
'vault.permissions': 'Permissions',
'vault.canView': 'View Metadata',
'vault.canReveal': 'Reveal Password',
'vault.canEdit': 'Edit',
'vault.noPermission': 'No Permission',
'vault.auditLog': 'Access Log',
'vault.settings': 'Vault Settings',
'vault.revealDuration': 'Reveal Duration (seconds)',
'vault.autoLock': 'Auto-lock After (minutes)',
'vault.require2FA': 'Require 2FA for Reveal',
'vault.emergencyLock': 'Emergency: Disable All Reveals',
'vault.generatePassword': 'Generate Password',
'vault.passwordStrength': 'Password Strength',
'vault.weak': 'Weak',
'vault.medium': 'Medium',
'vault.strong': 'Strong',
'vault.type.server': 'Server',
'vault.type.website': 'Website',
'vault.type.network_device': 'Network Device',
'vault.type.application': 'Application',
'vault.type.api_key': 'API Key',
'vault.type.other': 'Other',
'vault.relatedCredentials': 'Related Credentials',
```

---

## Phase 7: Security Implementation Details

### 7.1 Encryption Key Management

```text
Secret Name: VAULT_ENCRYPTION_KEY
Generation: openssl rand -hex 32
Storage: Supabase Secrets (never in code)

The key is used only in Edge Functions, never exposed to client.
```

### 7.2 Password Generation Utility

**File: `src/utils/passwordGenerator.ts`**

```text
Features:
1. Configurable length (8-64 characters)
2. Include options:
   - Uppercase letters (A-Z)
   - Lowercase letters (a-z)
   - Numbers (0-9)
   - Symbols (!@#$%^&*...)
3. Avoid ambiguous characters option (0, O, l, 1, etc.)
4. Uses crypto.getRandomValues() for secure randomness
5. Password strength meter (zxcvbn-style scoring)

Note: Generation happens client-side (preview before save).
```

### 7.3 Clipboard Security

```text
Features:
1. After copying password, clear clipboard after 30 seconds
2. Use navigator.clipboard.writeText() with permission check
3. On mobile: show toast instead of auto-copy
4. Never store copied password in any state/storage
```

### 7.4 Auto-Lock Implementation

**File: `src/hooks/useVaultAutoLock.ts`**

```text
Features:
1. Track last activity timestamp
2. Check activity on mouse move, keypress, click
3. After X minutes of inactivity, lock the vault
4. Locked state: clear any revealed passwords, require re-auth
5. Use sessionStorage flag to track lock state
6. On lock: redirect to vault with "locked" message
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Vault.tsx` | Main vault page |
| `src/components/vault/VaultItemCard.tsx` | Individual credential card |
| `src/components/vault/VaultItemForm.tsx` | Add/edit credential form |
| `src/components/vault/VaultItemDetail.tsx` | Detail modal with reveal |
| `src/components/vault/VaultSettings.tsx` | Admin settings panel |
| `src/components/vault/VaultAuditLog.tsx` | Vault-specific audit log |
| `src/components/vault/VaultPasswordField.tsx` | Masked password with reveal |
| `src/components/vault/VaultPermissionsEditor.tsx` | Per-item permissions UI |
| `src/utils/passwordGenerator.ts` | Secure password generation |
| `src/hooks/useVaultData.ts` | Vault data fetching hooks |
| `src/hooks/useVaultAutoLock.ts` | Auto-lock functionality |
| `supabase/functions/vault-encrypt/index.ts` | Server-side encryption |
| `supabase/functions/vault-decrypt/index.ts` | Server-side decryption |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add /vault route |
| `src/components/layout/Sidebar.tsx` | Add Vault menu item |
| `src/pages/Servers.tsx` | Add "Related Credentials" section |
| `src/contexts/LanguageContext.tsx` | Add vault translations |
| `src/lib/supabase.ts` | Add VaultItem type |

---

## Database Migration Summary

```sql
-- 1. Create vault_role enum
-- 2. Create vault_items table with encrypted password field
-- 3. Create vault_permissions table for per-item access
-- 4. Create vault_audit_logs table
-- 5. Create vault_settings table with defaults
-- 6. Enable RLS on all vault tables
-- 7. Create helper functions (has_vault_permission, owns_vault_item)
-- 8. Create RLS policies for each table
```

---

## Secrets Required

| Secret Name | Purpose |
|-------------|---------|
| `VAULT_ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM encryption |

---

## Acceptance Criteria

- [ ] Vault items can be created with encrypted passwords
- [ ] Passwords are NEVER stored in plaintext
- [ ] Passwords are NEVER logged (console, audit, or network)
- [ ] Password reveal requires permission and is time-limited
- [ ] All vault actions are logged in vault_audit_logs
- [ ] Admins can see all vault items
- [ ] Users can only see items they have explicit permission for
- [ ] Per-item permissions work correctly (view/reveal/edit)
- [ ] Emergency lockout disables all password reveals
- [ ] Auto-lock works after configured inactivity
- [ ] Sidebar shows Vault link with Lock icon
- [ ] Server page shows "Related Credentials" section
- [ ] UI supports Arabic and English
- [ ] No bulk export of passwords
- [ ] Clipboard is cleared after copying password
- [ ] Password generator creates secure passwords
