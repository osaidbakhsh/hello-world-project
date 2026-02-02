
# Comprehensive Enhancement Plan

## Overview

This plan addresses 7 major feature requests based on user feedback and screenshots:

1. **VM Form Auto-fill from Server Selection** - When selecting a server in VM form, auto-populate name, IP, OS, etc.
2. **File Share Domain Credentials** - Add username/password fields for SMB share authentication
3. **Mail Settings Enhancement** - Fix test connection (config_id issue), add username/password fields for SMTP auth
4. **NTP Test Fix** - Fix "config_id is required" error by saving config before testing
5. **Employee Reports Download** - Add download functionality for uploaded reports
6. **Tasks Enhancement** - Filter servers by user domain access, add Import button for Excel bulk import
7. **Network Scan Enhancement** - Auto-fill IP/subnet from selected network, make IP range optional

---

## Phase 1: VM Form Auto-fill from Server Selection

### Current Behavior
The VM form has a "Link to Server" dropdown that stores `server_ref_id`, but doesn't auto-fill any data when a server is selected.

### New Behavior
When user selects a server from dropdown, auto-populate:
- Name
- IP Address
- OS
- Environment

### Files to Modify
| File | Change |
|------|--------|
| `src/components/datacenter/VMTable.tsx` | Add useEffect to auto-fill form when server_ref_id changes |

### Implementation

```typescript
// Add effect to auto-fill form when server is selected
useEffect(() => {
  if (formData.server_ref_id) {
    const server = domainServers.find(s => s.id === formData.server_ref_id);
    if (server && !editingVM) {
      setFormData(prev => ({
        ...prev,
        name: server.name || prev.name,
        ip_address: server.ip_address || prev.ip_address,
        os: server.operating_system || prev.os,
        environment: (server.environment as VMEnvironment) || prev.environment,
      }));
    }
  }
}, [formData.server_ref_id, domainServers, editingVM]);
```

---

## Phase 2: File Share Domain Credentials

### Current Schema
`file_shares` table has `credential_vault_id` referencing the vault, but no direct credential fields.

### Enhancement
Add SMB credential fields to the form for domain authentication:
- Username (domain\user format)
- Password (stored in vault or local)

### Files to Modify
| File | Change |
|------|--------|
| `src/components/fileshares/FileShareForm.tsx` | Add username/password fields for SMB type |

### Database Migration Required
Add columns to `file_shares` table:
- `smb_username`: text (nullable)
- `smb_password_encrypted`: text (nullable, encrypted)

### Form Enhancement
```jsx
{formData.share_type === 'SMB' && (
  <>
    <div className="space-y-2">
      <Label>{t('fileShares.username')}</Label>
      <Input
        value={formData.smb_username}
        onChange={(e) => setFormData(p => ({ ...p, smb_username: e.target.value }))}
        placeholder="DOMAIN\\username"
      />
    </div>
    <div className="space-y-2">
      <Label>{t('fileShares.password')}</Label>
      <Input
        type="password"
        value={formData.smb_password}
        onChange={(e) => setFormData(p => ({ ...p, smb_password: e.target.value }))}
        placeholder="••••••••"
      />
    </div>
  </>
)}
```

---

## Phase 3: Mail Settings Enhancement

### Issues Identified
1. Test button shows "config_id is required for Mail test" - need to save config first
2. Missing username/password fields for SMTP authentication (required for Gmail, Outlook, etc.)
3. UI description mentions "Exchange Server 2019" but should support any SMTP

### Database Schema Check
Current `mail_configs` table is missing:
- `smtp_username`: text
- `smtp_password`: text (encrypted)

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Fix test flow, add SMTP auth fields, improve Gmail support |

### Database Migration
```sql
ALTER TABLE mail_configs 
  ADD COLUMN smtp_username text,
  ADD COLUMN smtp_password_encrypted text;
```

### Implementation Flow
1. **Before testing**: Upsert config to `mail_configs` table to get config_id
2. **Test button**: Pass config_id to edge function
3. **UI Update**: Add username/password fields, update descriptions

### Form Enhancement
```jsx
<div className="space-y-2">
  <Label>{t('settings.smtpUsername')}</Label>
  <Input
    value={mailSettings.smtp_user}
    onChange={(e) => setMailSettings({ ...mailSettings, smtp_user: e.target.value })}
    placeholder="user@gmail.com"
  />
</div>
<div className="space-y-2">
  <Label>{t('settings.smtpPassword')}</Label>
  <Input
    type="password"
    value={mailSettings.smtp_password}
    onChange={(e) => setMailSettings({ ...mailSettings, smtp_password: e.target.value })}
    placeholder="••••••••"
  />
  <p className="text-xs text-muted-foreground">
    {t('settings.gmailAppPasswordHint')}
  </p>
</div>
```

### Test Button Fix
```typescript
const handleTestMail = async () => {
  if (!selectedDomainId) {
    toast({ title: t('common.error'), description: t('settings.selectDomainFirst'), variant: 'destructive' });
    return;
  }
  
  setIsTestingMail(true);
  setMailTestResult(null);
  
  try {
    // First save/upsert the config to get a config_id
    const { data: config, error: saveError } = await supabase
      .from('mail_configs')
      .upsert({
        domain_id: selectedDomainId,
        name: 'Default Mail Config',
        smtp_host: mailSettings.smtp_host,
        smtp_port: parseInt(mailSettings.smtp_port) || 587,
        use_tls: mailSettings.smtp_encryption === 'tls',
        from_email: mailSettings.smtp_from_email,
        from_name: mailSettings.smtp_from_name,
        smtp_username: mailSettings.smtp_user,
        is_active: mailSettings.smtp_enabled,
      }, { onConflict: 'domain_id' })
      .select()
      .single();
    
    if (saveError) throw saveError;
    
    // Now test with config_id
    const response = await supabase.functions.invoke('test-connection', {
      body: { domain_id: selectedDomainId, module: 'mail', config_id: config.id }
    });
    
    setMailTestResult(response.data || { success: false, status: 'fail', message: 'No response' });
  } catch (error: any) {
    setMailTestResult({ success: false, status: 'fail', message: error.message });
  } finally {
    setIsTestingMail(false);
  }
};
```

---

## Phase 4: NTP Test Fix

### Issue
Same as mail - test button doesn't save config first, so config_id is missing.

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Fix handleTestNtp to save config first |

### Implementation
```typescript
const handleTestNtp = async () => {
  if (!selectedDomainId) {
    toast({ title: t('common.error'), description: t('settings.selectDomainFirst'), variant: 'destructive' });
    return;
  }
  
  setIsTestingNtp(true);
  setNtpTestResult(null);
  
  try {
    // Save config first
    const { data: config, error: saveError } = await supabase
      .from('ntp_configs')
      .upsert({
        domain_id: selectedDomainId,
        name: 'Default NTP Config',
        servers: [ntpSettings.ntp_server_primary, ntpSettings.ntp_server_secondary].filter(Boolean),
        sync_interval_seconds: parseInt(ntpSettings.ntp_sync_interval) || 3600,
        is_active: ntpSettings.ntp_enabled,
      }, { onConflict: 'domain_id' })
      .select()
      .single();
    
    if (saveError) throw saveError;
    
    const response = await supabase.functions.invoke('test-connection', {
      body: { domain_id: selectedDomainId, module: 'ntp', config_id: config.id }
    });
    
    setNtpTestResult(response.data || { success: false, status: 'fail', message: 'No response' });
  } catch (error: any) {
    setNtpTestResult({ success: false, status: 'fail', message: error.message });
  } finally {
    setIsTestingNtp(false);
  }
};
```

---

## Phase 5: Employee Reports Download

### Current Behavior
Reports are uploaded with `file_name` stored, but actual file is not saved to storage. The `file_url` column exists but is not populated.

### Enhancement Options
**Option A**: Store file in Supabase Storage (recommended)
**Option B**: Store file content as base64 in database

### Recommended Implementation (Option A)

1. **Upload Flow**: Save file to Supabase Storage bucket `employee-reports`
2. **Store URL**: Save the storage URL in `file_url` column
3. **Download**: Generate signed URL and trigger download

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/EmployeeReports.tsx` | Add file upload to storage, add download button |

### Implementation
```typescript
// Upload to storage
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!formData.profile_id || !selectedFile) {
    toast({ ... });
    return;
  }

  try {
    // Upload file to storage
    const filePath = `${formData.profile_id}/${Date.now()}_${selectedFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('employee-reports')
      .upload(filePath, selectedFile);
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('employee-reports')
      .getPublicUrl(filePath);

    const reportData = {
      profile_id: formData.profile_id,
      report_date: formData.report_date,
      report_type: formData.report_type,
      file_name: selectedFile.name,
      file_url: filePath, // Store path for signed URL generation
      notes: formData.notes || null,
      uploaded_by: profile?.id,
    };

    const { error } = await supabase.from('employee_reports').insert([reportData]);
    if (error) throw error;

    toast({ title: t('common.success') });
    ...
  } catch (error: any) {
    toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
  }
};

// Download handler
const handleDownload = async (report: EmployeeReport) => {
  if (!report.file_url) {
    toast({ title: t('common.error'), description: t('employeeReports.noFile'), variant: 'destructive' });
    return;
  }
  
  try {
    const { data, error } = await supabase.storage
      .from('employee-reports')
      .download(report.file_url);
    
    if (error) throw error;
    
    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = report.file_name || 'report.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  } catch (error: any) {
    toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
  }
};
```

### Storage Bucket Creation (SQL)
```sql
-- Create storage bucket for employee reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-reports', 'employee-reports', false);

-- RLS policy for bucket access
CREATE POLICY "Users can upload their reports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'employee-reports');

CREATE POLICY "Admins can view all reports"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'employee-reports');
```

---

## Phase 6: Tasks Enhancement

### Requirement 1: Filter Servers by User Domain Access
When adding a task, only show servers that the assigned employee has access to via domain_memberships.

### Requirement 2: Add Import Button for Excel Bulk Import
Allow admins to import tasks from Excel with format:
- Employee Name
- Task Title
- Description
- Due Date
- Frequency
- Server (optional)

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/Tasks.tsx` | Filter servers, add Import button and dialog |

### Server Filtering Logic
```typescript
// Get user's domain memberships
const { data: memberships } = useDomainMemberships(formData.assigned_to || profile?.id);

// Filter servers by accessible domains
const accessibleDomainIds = memberships?.map(m => m.domain_id) || [];

// Get servers from accessible domains
const accessibleServers = useMemo(() => {
  if (!formData.assigned_to && !profile?.id) return servers;
  
  // Get networks for accessible domains
  return servers.filter(server => {
    const network = networks.find(n => n.id === server.network_id);
    if (!network) return false;
    return accessibleDomainIds.includes(network.domain_id);
  });
}, [servers, networks, accessibleDomainIds]);
```

### Import Dialog
```jsx
<Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>{t('tasks.importTasks')}</DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('tasks.importFile')} (Excel)</Label>
        <Input type="file" accept=".xlsx,.xls" onChange={handleImportFileChange} />
      </div>
      
      {importPreview.length > 0 && (
        <div className="space-y-2">
          <Label>{t('tasks.preview')}</Label>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importPreview.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.employee_name}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.due_date}</TableCell>
                  <TableCell>
                    {row.profile_id ? (
                      <Badge className="bg-green-500/10 text-green-700">Ready</Badge>
                    ) : (
                      <Badge variant="destructive">Employee not found</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setShowImportDialog(false)}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleImportSubmit} disabled={importPreview.length === 0}>
          {t('common.import')} ({importPreview.filter(r => r.profile_id).length})
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

## Phase 7: Network Scan Enhancement

### Requirements
1. Auto-fill IP range from selected network's subnet
2. Make IP range optional (use network subnet if not specified)
3. Filter networks by selected domain

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/NetworkScan.tsx` | Auto-fill from network, make IP range optional |

### Implementation
```typescript
// Filter networks by domain
const filteredNetworks = useMemo(() => {
  if (!selectedDomainId) return networks;
  return networks.filter(n => n.domain_id === selectedDomainId);
}, [networks, selectedDomainId]);

// Auto-fill IP range when network is selected
useEffect(() => {
  if (selectedNetworkId) {
    const network = networks.find(n => n.id === selectedNetworkId);
    if (network?.subnet) {
      setIpRange(network.subnet);
    }
  }
}, [selectedNetworkId, networks]);

// Update validation - IP range optional if network selected
const handleStartScan = async () => {
  if (!scanName) {
    toast({ title: t('common.error'), description: t('scan.nameRequired'), variant: 'destructive' });
    return;
  }
  
  // Use IP range from form or from network
  let scanIpRange = ipRange;
  if (!scanIpRange && selectedNetworkId) {
    const network = networks.find(n => n.id === selectedNetworkId);
    scanIpRange = network?.subnet || '';
  }
  
  if (!scanIpRange) {
    toast({ title: t('common.error'), description: t('scan.ipRangeRequired'), variant: 'destructive' });
    return;
  }
  
  // Proceed with scan...
};
```

### UI Enhancement
- Add placeholder showing network subnet
- Show hint that IP range is auto-filled from network
- Mark IP range field as optional

---

## Database Migrations Required

### Migration 1: Mail Config Auth Fields
```sql
ALTER TABLE mail_configs 
  ADD COLUMN IF NOT EXISTS smtp_username text,
  ADD COLUMN IF NOT EXISTS smtp_password_encrypted text;
```

### Migration 2: File Share Credentials
```sql
ALTER TABLE file_shares 
  ADD COLUMN IF NOT EXISTS smb_username text,
  ADD COLUMN IF NOT EXISTS smb_password_encrypted text;
```

### Migration 3: Storage Bucket for Reports
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-reports', 'employee-reports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies
CREATE POLICY "Authenticated users can upload reports" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'employee-reports');

CREATE POLICY "Authenticated users can read reports" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'employee-reports');

CREATE POLICY "Authenticated users can delete own reports" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'employee-reports');
```

---

## New Translations

### Arabic
```text
'fileShares.username': 'اسم المستخدم',
'fileShares.password': 'كلمة المرور',
'fileShares.domainCredentials': 'بيانات اعتماد الدومين',
'settings.smtpUsername': 'اسم المستخدم',
'settings.smtpPassword': 'كلمة المرور',
'settings.gmailAppPasswordHint': 'لـ Gmail، استخدم "كلمة مرور التطبيق" بدلاً من كلمة المرور العادية',
'settings.selectDomainFirst': 'اختر النطاق أولاً',
'employeeReports.download': 'تحميل',
'employeeReports.noFile': 'الملف غير متوفر',
'tasks.importTasks': 'استيراد المهام',
'tasks.importFile': 'ملف الاستيراد',
'tasks.preview': 'معاينة',
'scan.nameRequired': 'اسم الفحص مطلوب',
'scan.ipRangeOptional': 'نطاق IP (اختياري إذا تم اختيار الشبكة)',
'scan.autoFilledFromNetwork': 'تم الملء تلقائياً من الشبكة المحددة',
```

### English
```text
'fileShares.username': 'Username',
'fileShares.password': 'Password',
'fileShares.domainCredentials': 'Domain Credentials',
'settings.smtpUsername': 'Username',
'settings.smtpPassword': 'Password',
'settings.gmailAppPasswordHint': 'For Gmail, use "App Password" instead of your regular password',
'settings.selectDomainFirst': 'Select a domain first',
'employeeReports.download': 'Download',
'employeeReports.noFile': 'File not available',
'tasks.importTasks': 'Import Tasks',
'tasks.importFile': 'Import File',
'tasks.preview': 'Preview',
'scan.nameRequired': 'Scan name is required',
'scan.ipRangeOptional': 'IP Range (optional if network selected)',
'scan.autoFilledFromNetwork': 'Auto-filled from selected network',
```

---

## Files Summary

### Files to Create
- None

### Files to Modify
| File | Changes |
|------|---------|
| `src/contexts/LanguageContext.tsx` | Add ~15 new translation keys |
| `src/components/datacenter/VMTable.tsx` | Add server auto-fill effect |
| `src/components/fileshares/FileShareForm.tsx` | Add SMB credential fields |
| `src/pages/Settings.tsx` | Fix test connection flow, add SMTP auth fields |
| `src/pages/EmployeeReports.tsx` | Add file storage upload, add download button |
| `src/pages/Tasks.tsx` | Filter servers by domain access, add Import dialog |
| `src/pages/NetworkScan.tsx` | Auto-fill IP from network, make optional, filter networks |

### Database Migrations
1. Add SMTP auth columns to `mail_configs`
2. Add SMB credentials to `file_shares`
3. Create storage bucket `employee-reports` with RLS policies

---

## Implementation Order

1. **Database Migrations** - Add required columns and storage bucket
2. **Translations** - Add all new keys
3. **Settings.tsx** - Fix test connection flow (high priority - user reported issue)
4. **VMTable.tsx** - Add server auto-fill
5. **FileShareForm.tsx** - Add SMB credentials
6. **EmployeeReports.tsx** - Add download functionality
7. **Tasks.tsx** - Add server filtering and import
8. **NetworkScan.tsx** - Auto-fill and optional IP range

---

## Verification Checklist

After implementation:
- [ ] VM form auto-fills data when server is selected
- [ ] File Share form shows username/password for SMB type
- [ ] Mail test button works and shows result
- [ ] NTP test button works and shows result
- [ ] Employee reports can be downloaded
- [ ] Tasks form only shows accessible servers
- [ ] Tasks import from Excel works
- [ ] Network scan auto-fills IP from network
- [ ] Network scan works with just network selected (no manual IP)
