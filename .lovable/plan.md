
# Comprehensive Enhancement Plan

## Summary of Issues Identified

From the user's screenshots and feedback, I've identified the following issues:

1. **Network Scan** - Needs real network scanning like "Advanced IP Scanner", not just searching existing servers
2. **Mail Settings** - Test connection fails with "no unique constraint matching ON CONFLICT" error
3. **Employee Reports** - Only accepts Excel files, needs PDF/TXT/PNG support
4. **Tasks Import** - Employee name "Anas" in Excel not being matched correctly
5. **VM Auto-fill** - When selecting a server, should also auto-fill RAM, vCPU, Disk, Environment, Owner, Beneficiary
6. **Datacenter Management** - Need a dedicated tab/section to manage datacenters with full CRUD

---

## Phase 1: Fix Mail/NTP/LDAP Test Connection Error

**Root Cause:** The `mail_configs`, `ntp_configs`, and `ldap_configs` tables have only PRIMARY KEY constraint on `id`, not a UNIQUE constraint on `domain_id`. The upsert with `onConflict: 'domain_id'` fails.

**Solution:** Change the upsert logic to use INSERT with check for existing config instead of relying on onConflict.

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Change upsert logic to check existing then insert/update |

### Implementation
```typescript
const handleTestMail = async () => {
  if (!selectedDomainId) {
    toast({ title: t('common.error'), description: t('settings.selectDomainFirst'), variant: 'destructive' });
    return;
  }
  setIsTestingMail(true);
  setMailTestResult(null);
  try {
    // Check if config exists for this domain
    const { data: existingConfig } = await supabase
      .from('mail_configs')
      .select('id')
      .eq('domain_id', selectedDomainId)
      .single();
    
    const configData = {
      domain_id: selectedDomainId,
      name: 'Default Mail Config',
      smtp_host: mailSettings.smtp_host || 'smtp.example.com',
      smtp_port: parseInt(mailSettings.smtp_port) || 587,
      use_tls: mailSettings.smtp_encryption === 'tls',
      from_email: mailSettings.smtp_from_email,
      from_name: mailSettings.smtp_from_name,
      smtp_username: mailSettings.smtp_user,
      is_active: mailSettings.smtp_enabled,
    };
    
    let configId;
    if (existingConfig) {
      // Update existing
      const { error } = await supabase
        .from('mail_configs')
        .update(configData)
        .eq('id', existingConfig.id);
      if (error) throw error;
      configId = existingConfig.id;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('mail_configs')
        .insert(configData)
        .select()
        .single();
      if (error) throw error;
      configId = data.id;
    }
    
    // Now test with config_id
    const response = await supabase.functions.invoke('test-connection', {
      body: { domain_id: selectedDomainId, module: 'mail', config_id: configId }
    });
    setMailTestResult(response.data || { success: false, status: 'fail', message: 'No response' });
  } catch (error: any) {
    setMailTestResult({ success: false, status: 'fail', message: error.message });
  } finally {
    setIsTestingMail(false);
  }
};
```

Apply same pattern for `handleTestNtp` and `handleTestLdap`.

---

## Phase 2: Enhanced Employee Reports - Support Multiple File Types

**Current Behavior:** Only accepts `.xlsx,.xls` files

**New Behavior:** Accept PDF, TXT, PNG, JPG, and Excel files

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/EmployeeReports.tsx` | Expand file accept types, update preview logic |

### Changes
```jsx
// Change file input accept attribute
accept=".xlsx,.xls,.pdf,.txt,.png,.jpg,.jpeg"

// Update preview logic - only show preview for Excel files
if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
  // Excel preview logic
} else if (file.name.endsWith('.pdf')) {
  setPreviewData([{ type: 'PDF', name: file.name, size: file.size }]);
} else if (file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
  // Image preview using URL.createObjectURL
  setPreviewData([{ type: 'Image', name: file.name, preview: URL.createObjectURL(file) }]);
} else if (file.name.endsWith('.txt')) {
  // Text file preview - read first 500 chars
  const text = await file.text();
  setPreviewData([{ type: 'Text', content: text.substring(0, 500) }]);
}
```

---

## Phase 3: Fix Tasks Import - Improve Employee Name Matching

**Issue:** Excel has "Anas" but the matching logic doesn't find the employee profile correctly.

**Root Cause:** The matching logic uses `includes` which may fail on exact names or case sensitivity issues.

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/Tasks.tsx` | Improve employee name matching with normalized comparison |

### Enhanced Matching Logic
```typescript
const normalizeArabicName = (name: string) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    // Normalize Arabic characters
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
};

// Match employees by name
const preview = jsonData.map((row: any) => {
  const employeeName = row['الموظف'] || row['اسم الموظف'] || row['Employee'] || row['employee_name'] || '';
  const normalizedInput = normalizeArabicName(employeeName);
  
  const foundEmployee = profiles.find(p => {
    const normalizedProfile = normalizeArabicName(p.full_name);
    // Exact match
    if (normalizedProfile === normalizedInput) return true;
    // Contains match
    if (normalizedProfile.includes(normalizedInput) || normalizedInput.includes(normalizedProfile)) return true;
    // First name match
    const inputFirstName = normalizedInput.split(' ')[0];
    const profileFirstName = normalizedProfile.split(' ')[0];
    if (inputFirstName === profileFirstName && inputFirstName.length >= 3) return true;
    return false;
  });
  
  return {
    ...row,
    employee_name: employeeName,
    title: row['المهمة'] || row['عنوان المهمة'] || row['Task'] || row['title'] || '',
    description: row['الوصف'] || row['Description'] || row['description'] || '',
    due_date: row['تاريخ الاستحقاق'] || row['Due Date'] || row['due_date'] || '',
    frequency: mapFrequency(row['التكرار'] || row['Frequency'] || row['frequency'] || 'once'),
    profile_id: foundEmployee?.id || null,
  };
});
```

Also add frequency mapping:
```typescript
const mapFrequency = (freq: string) => {
  const freqLower = freq.toLowerCase();
  if (freqLower.includes('يوم') || freqLower === 'daily') return 'daily';
  if (freqLower.includes('أسبوع') || freqLower === 'weekly' || freqLower.includes('شهري')) return 'weekly';
  if (freqLower.includes('شهر') || freqLower === 'monthly') return 'monthly';
  if (freqLower.includes('مرة') || freqLower === 'once') return 'once';
  return 'once';
};
```

---

## Phase 4: VM Auto-fill Enhancement

**Issue:** When selecting a server, only name, IP, OS, environment are filled. User wants RAM, vCPU, Disk, Owner, Beneficiary also filled.

**Challenge:** The `servers` table has `ram` and `cpu` as text fields (e.g., "16GB", "4 cores"), but VM table expects numeric values. Need to parse these.

### Files to Modify
| File | Change |
|------|--------|
| `src/components/datacenter/VMTable.tsx` | Enhance auto-fill to include more fields with parsing |

### Implementation
```typescript
// Helper function to parse RAM from text like "16GB" or "16 GB"
const parseRamGb = (ramStr: string | null): number => {
  if (!ramStr) return 16; // default
  const match = ramStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 16;
};

// Helper function to parse CPU cores from text like "4 cores" or "4"
const parseCpuCores = (cpuStr: string | null): number => {
  if (!cpuStr) return 4; // default
  const match = cpuStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 4;
};

// Helper function to parse disk from text like "500GB" or "500"
const parseDiskGb = (diskStr: string | null): number => {
  if (!diskStr) return 100; // default
  const match = diskStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 100;
};

// Enhanced auto-fill effect
React.useEffect(() => {
  if (formData.server_ref_id && !editingVM && formData.server_ref_id !== 'none') {
    const server = domainServers.find(s => s.id === formData.server_ref_id);
    if (server) {
      setFormData(prev => ({
        ...prev,
        name: server.name || prev.name,
        ip_address: server.ip_address || prev.ip_address,
        os: server.operating_system || prev.os,
        environment: (server.environment as VMEnvironment) || prev.environment,
        ram_gb: parseRamGb(server.ram),
        vcpu: parseCpuCores(server.cpu),
        disk_total_gb: parseDiskGb(server.disk_space),
        owner_department: server.beneficiary_department || server.owner || prev.owner_department,
        beneficiary: server.business_owner || prev.beneficiary,
      }));
    }
  }
}, [formData.server_ref_id, domainServers, editingVM]);
```

---

## Phase 5: Datacenter Management Tab

**Issue:** Need a dedicated section to view and manage datacenters with edit/delete functionality.

### Files to Create
| File | Description |
|------|-------------|
| `src/components/datacenter/DatacenterTable.tsx` | Table component with CRUD for datacenters |

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/Datacenter.tsx` | Add "Datacenters" tab between Overview and Physical |
| `src/hooks/useDatacenter.ts` | Add hooks for datacenter CRUD operations |

### DatacenterTable.tsx Structure
```typescript
const DatacenterTable: React.FC<Props> = ({ domainId }) => {
  const { data: datacenters } = useDatacenters(domainId);
  // State for edit/delete dialogs
  // Table with columns: Name, Location, Clusters Count, Nodes Count, VMs Count, Actions
  // Edit dialog with full form
  // Delete confirmation dialog
};
```

### New Tab in Datacenter.tsx
```jsx
<TabsList>
  <TabsTrigger value="overview">...</TabsTrigger>
  <TabsTrigger value="datacenters" className="gap-2">
    <Database className="w-4 h-4" />
    {language === 'ar' ? 'مراكز البيانات' : 'Datacenters'}
  </TabsTrigger>
  <TabsTrigger value="physical">...</TabsTrigger>
  ...
</TabsList>

<TabsContent value="datacenters">
  <DatacenterTable domainId={selectedDomainId} />
</TabsContent>
```

### Enhanced Datacenter Fields
Add professional fields to DatacenterForm:
- Power Capacity (kW)
- Cooling Type (Air/Water/Liquid)
- Tier Level (Tier 1-4)
- Rack Count
- Total Floor Space (sqm)
- Compliance Certifications
- Contact Person
- Emergency Contact

---

## Phase 6: Network Scan Like Advanced IP Scanner

**Current Behavior:** Simulates scan and shows fake results.

**Issue:** User wants real network scanning that discovers devices on internal/external networks.

**Technical Limitation:** Browser-based scanning is not possible due to security restrictions. Real network scanning requires an agent.

### Solution Options

**Option A (Recommended):** Improve the agent-based scanning system
- The existing agent infrastructure (`scan_agents`, `scan_jobs`, `scan_results`) is designed for this
- Enhance the UI to show that an agent is required for real scanning
- When agent is available, use it for actual scanning

**Option B:** Enhance simulation with better device discovery
- Parse the selected network's subnet
- Generate more realistic results based on common IP patterns
- Show comparison with existing servers to identify "new" vs "known" devices

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/NetworkScan.tsx` | Add comparison with existing servers, better UI for discovery |

### UI Enhancements
```jsx
// Add comparison indicator in results table
<TableCell>
  {existingServers.some(s => s.ip_address === result.ip_address) ? (
    <Badge className="bg-blue-500/10 text-blue-700">
      {language === 'ar' ? 'موجود' : 'Existing'}
    </Badge>
  ) : (
    <Badge className="bg-green-500/10 text-green-700">
      {language === 'ar' ? 'جديد' : 'New'}
    </Badge>
  )}
</TableCell>
```

---

## Database Migrations Required

### Migration: Add unique constraint on domain_id for config tables
```sql
-- Add unique constraints for upsert to work properly
CREATE UNIQUE INDEX IF NOT EXISTS mail_configs_domain_id_idx 
  ON mail_configs(domain_id) 
  WHERE domain_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ntp_configs_domain_id_idx 
  ON ntp_configs(domain_id) 
  WHERE domain_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ldap_configs_domain_id_idx 
  ON ldap_configs(domain_id) 
  WHERE domain_id IS NOT NULL;
```

### Migration: Enhance datacenters table with professional fields
```sql
ALTER TABLE datacenters 
  ADD COLUMN IF NOT EXISTS power_capacity_kw integer,
  ADD COLUMN IF NOT EXISTS cooling_type text,
  ADD COLUMN IF NOT EXISTS tier_level text,
  ADD COLUMN IF NOT EXISTS rack_count integer,
  ADD COLUMN IF NOT EXISTS floor_space_sqm numeric,
  ADD COLUMN IF NOT EXISTS certifications text[],
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS emergency_contact text;
```

---

## New Translations

### Arabic
```text
'datacenter.datacentersTab': 'مراكز البيانات',
'datacenter.powerCapacity': 'سعة الطاقة (كيلوواط)',
'datacenter.coolingType': 'نوع التبريد',
'datacenter.tierLevel': 'مستوى المركز',
'datacenter.rackCount': 'عدد الخزائن',
'datacenter.floorSpace': 'المساحة (م²)',
'datacenter.certifications': 'الشهادات',
'datacenter.contactPerson': 'جهة الاتصال',
'datacenter.emergencyContact': 'رقم الطوارئ',
'employeeReports.fileTypes': 'الملفات المدعومة: Excel, PDF, صور',
'scan.existingServer': 'موجود',
'scan.newDevice': 'جديد',
'scan.compareWithExisting': 'مقارنة مع السيرفرات الموجودة',
```

### English
```text
'datacenter.datacentersTab': 'Datacenters',
'datacenter.powerCapacity': 'Power Capacity (kW)',
'datacenter.coolingType': 'Cooling Type',
'datacenter.tierLevel': 'Tier Level',
'datacenter.rackCount': 'Rack Count',
'datacenter.floorSpace': 'Floor Space (sqm)',
'datacenter.certifications': 'Certifications',
'datacenter.contactPerson': 'Contact Person',
'datacenter.emergencyContact': 'Emergency Contact',
'employeeReports.fileTypes': 'Supported files: Excel, PDF, Images',
'scan.existingServer': 'Existing',
'scan.newDevice': 'New',
'scan.compareWithExisting': 'Compare with existing servers',
```

---

## Files Summary

### Files to Create
| File | Description |
|------|-------------|
| `src/components/datacenter/DatacenterTable.tsx` | Full CRUD table for datacenters |

### Files to Modify
| File | Changes |
|------|---------|
| `src/contexts/LanguageContext.tsx` | Add new translations |
| `src/pages/Settings.tsx` | Fix upsert logic for config tables |
| `src/pages/EmployeeReports.tsx` | Support PDF/TXT/PNG file uploads |
| `src/pages/Tasks.tsx` | Improve employee name matching |
| `src/pages/Datacenter.tsx` | Add datacenters tab |
| `src/pages/NetworkScan.tsx` | Add comparison with existing servers |
| `src/components/datacenter/VMTable.tsx` | Enhanced auto-fill with RAM/CPU/Disk parsing |
| `src/components/datacenter/DatacenterForm.tsx` | Add professional datacenter fields |
| `src/hooks/useDatacenter.ts` | Add CRUD hooks for datacenters |

---

## Implementation Order

1. **Database Migration** - Add unique constraints and new datacenter fields
2. **Settings.tsx** - Fix mail/NTP/LDAP test connection (highest priority)
3. **Tasks.tsx** - Fix employee name matching for import
4. **VMTable.tsx** - Enhance auto-fill with all fields
5. **EmployeeReports.tsx** - Support multiple file types
6. **DatacenterTable.tsx + hooks** - Create datacenter management
7. **Datacenter.tsx** - Add datacenters tab
8. **NetworkScan.tsx** - Add server comparison feature
9. **Translations** - Add all new keys

---

## Technical Notes

### Network Scanning Limitations
Real network scanning from a browser is not possible due to:
- CORS restrictions
- No access to raw sockets
- Browser security sandbox

The agent-based approach (`scan_agents` system) is the correct architecture for real scanning. The "simulated" scan is acceptable for demo/testing, but production use requires deploying scan agents.

### Server Data Parsing
The servers table stores RAM/CPU/Disk as text fields which may contain various formats:
- "16GB", "16 GB", "16"
- "4 cores", "4 CPU", "4"
- "500GB", "500 GB", "0.5TB"

The parsing functions need to handle these variations gracefully.
