
# UI Enhancements + Datacenter Fixes + Test Connection Implementation

## Overview

This plan addresses the remaining UI enhancements, fixes the datacenter management issues, implements VM-Server linking, corrects missing translations, and makes test connection buttons functional with proper outcome display.

---

## Issues Identified from User Screenshots

1. **"common.status" appearing as raw key** - Missing translation in NodeTable and VMTable
2. **No edit/delete actions for Nodes in Physical tab** - Only add is available
3. **Test buttons not working** - "اختبار الاتصال" buttons are not wired to call the edge function
4. **VM not linked to Servers** - Need to create server record when adding VM
5. **Hierarchy needs enhancement** - Show Domain → Datacenter → Cluster → Network → Server flow
6. **Missing datacenter selection in cluster form**

---

## Phase 1: Fix Missing Translations

### Files to Modify
| File | Change |
|------|--------|
| `src/contexts/LanguageContext.tsx` | Add missing translation keys |

### New Translation Keys (Arabic)
```text
'common.status': 'الحالة',
'datacenter.datacenter': 'مركز البيانات',
'datacenter.datacenters': 'مراكز البيانات',
'datacenter.addDatacenter': 'إضافة مركز بيانات',
'datacenter.selectDatacenter': 'اختر مركز البيانات',
'datacenter.location': 'الموقع',
'datacenter.noDatacenters': 'لا توجد مراكز بيانات',
'datacenter.editNode': 'تعديل النود',
'datacenter.deleteNode': 'حذف النود',
'datacenter.editVM': 'تعديل VM',
'datacenter.deleteVM': 'حذف VM',
'datacenter.linkToServer': 'ربط بسيرفر',
'datacenter.createServer': 'إنشاء سيرفر جديد',
'settings.testConnection': 'اختبار الاتصال',
'settings.testSuccess': 'نجح الاختبار',
'settings.testFailed': 'فشل الاختبار',
'settings.testResult': 'نتيجة الاختبار',
'settings.testDetails': 'تفاصيل الاختبار',
'settings.latency': 'زمن الاستجابة',
'settings.validationOnly': 'التحقق من الصيغة فقط',
```

### New Translation Keys (English)
```text
'common.status': 'Status',
'datacenter.datacenter': 'Datacenter',
'datacenter.datacenters': 'Datacenters',
'datacenter.addDatacenter': 'Add Datacenter',
'datacenter.selectDatacenter': 'Select Datacenter',
'datacenter.location': 'Location',
'datacenter.noDatacenters': 'No datacenters found',
'datacenter.editNode': 'Edit Node',
'datacenter.deleteNode': 'Delete Node',
'datacenter.editVM': 'Edit VM',
'datacenter.deleteVM': 'Delete VM',
'datacenter.linkToServer': 'Link to Server',
'datacenter.createServer': 'Create New Server',
'settings.testConnection': 'Test Connection',
'settings.testSuccess': 'Test Successful',
'settings.testFailed': 'Test Failed',
'settings.testResult': 'Test Result',
'settings.testDetails': 'Test Details',
'settings.latency': 'Latency',
'settings.validationOnly': 'Validation only',
```

---

## Phase 2: NodeTable Edit/Delete Actions

### Files to Modify
| File | Change |
|------|--------|
| `src/components/datacenter/NodeTable.tsx` | Add edit/delete buttons, edit dialog, confirmation |
| `src/hooks/useDatacenter.ts` | Already has useUpdateNode and useDeleteNode hooks |

### Changes to NodeTable.tsx

1. **Add Actions column to table header**
2. **Add Edit/Delete buttons in each row**
3. **Add edit dialog with form fields**
4. **Add delete confirmation dialog**
5. **Wire up useUpdateNode and useDeleteNode mutations**

### Table Row Enhancement
```text
+-----+--------+------+-----+-----+-------+--------+--------+---------+
| Name| Cluster| Role | CPU | RAM | Storage| Mgmt IP| Status | Actions |
+-----+--------+------+-----+-----+-------+--------+--------+---------+
                                                              [Edit][Delete]
```

---

## Phase 3: VMTable Edit/Delete Actions + Server Linking

### Files to Modify
| File | Change |
|------|--------|
| `src/components/datacenter/VMTable.tsx` | Add edit/delete, server linking dropdown |
| `src/hooks/useDatacenter.ts` | Already has useUpdateVM and useDeleteVM |
| `src/hooks/useSupabaseData.ts` | Use existing server mutations |

### VM Form Enhancement

Add to VM creation/edit dialog:
1. **"Link to Server" dropdown** - Shows servers from same domain
2. **"Create as Server" checkbox** - When checked, creates a new server record linked to this VM

### Server Creation from VM

When creating VM with "Create as Server" checked:
```typescript
// Create server first
const server = await createServer({
  name: formData.name,
  ip_address: formData.ip_address,
  operating_system: formData.os,
  environment: formData.environment,
  domain_id: domainId,
  network_id: selectedNetworkId, // From cluster's datacenter context
  source: 'import',
  notes: 'Created from VM in Datacenter module',
});

// Then create VM with server_ref_id
await createVM({
  ...formData,
  server_ref_id: server.id,
});
```

---

## Phase 4: Cluster Form - Add Datacenter Selection

### Files to Modify
| File | Change |
|------|--------|
| `src/components/datacenter/ClusterForm.tsx` | Add datacenter dropdown before cluster fields |

### Form Flow

Current: Domain → Cluster fields
New: Domain → **Datacenter** → Cluster fields

The datacenter dropdown filters by selected domain and is required before saving the cluster.

---

## Phase 5: TopologyView Enhancement - Show Full Hierarchy

### Files to Modify
| File | Change |
|------|--------|
| `src/components/datacenter/TopologyView.tsx` | Add datacenter level to hierarchy |

### New Hierarchy Display
```text
📁 Domain
  └─ 🏢 Datacenter 1
      └─ 🖥️ Cluster 1 (Nutanix)
          └─ ⚡ Node 1
              └─ 💻 VM 1
              └─ 💻 VM 2
          └─ ⚡ Node 2
      └─ 🖥️ Cluster 2 (VMware)
  └─ 🏢 Datacenter 2
      └─ ...
```

### Logic Change
- Group clusters by datacenter_id
- Show datacenters as expandable level between domain and clusters

---

## Phase 6: Settings Test Connection - Wire Up Buttons

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Wire test buttons to edge function, show results |

### Implementation for Mail Tab (Lines 550-555)

Current:
```jsx
<Button variant="outline">
  اختبار الاتصال
</Button>
```

New:
```jsx
const [mailTestResult, setMailTestResult] = useState<TestResult | null>(null);
const [isTestingMail, setIsTestingMail] = useState(false);

const handleTestMail = async () => {
  setIsTestingMail(true);
  setMailTestResult(null);
  
  try {
    // First, save the config to get an ID
    const { data: config, error: saveError } = await supabase
      .from('mail_configs')
      .upsert({
        domain_id: selectedDomainId,
        name: 'Default Mail Config',
        smtp_host: mailSettings.smtp_host,
        smtp_port: parseInt(mailSettings.smtp_port),
        use_tls: mailSettings.smtp_encryption === 'tls',
        from_email: mailSettings.smtp_from_email,
        from_name: mailSettings.smtp_from_name,
        is_active: mailSettings.smtp_enabled,
      })
      .select()
      .single();
    
    if (saveError) throw saveError;
    
    // Call edge function
    const response = await supabase.functions.invoke('test-connection', {
      body: {
        domain_id: selectedDomainId,
        module: 'mail',
        config_id: config.id,
      }
    });
    
    setMailTestResult(response.data);
  } catch (error) {
    setMailTestResult({
      success: false,
      status: 'fail',
      message: error.message,
    });
  } finally {
    setIsTestingMail(false);
  }
};

// Button
<Button 
  variant="outline" 
  onClick={handleTestMail}
  disabled={isTestingMail || !selectedDomainId}
>
  {isTestingMail ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
  {t('settings.testConnection')}
</Button>

// Result Display
{mailTestResult && (
  <div className={cn(
    "p-4 rounded-lg border mt-4",
    mailTestResult.success 
      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
      : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
  )}>
    <div className="flex items-center gap-2">
      {mailTestResult.success ? (
        <CheckCircle className="w-5 h-5 text-green-600" />
      ) : (
        <XCircle className="w-5 h-5 text-red-600" />
      )}
      <span className="font-medium">
        {mailTestResult.success ? t('settings.testSuccess') : t('settings.testFailed')}
      </span>
      {mailTestResult.latency_ms && (
        <Badge variant="outline">{mailTestResult.latency_ms}ms</Badge>
      )}
    </div>
    <p className="text-sm mt-2">{mailTestResult.message}</p>
    {mailTestResult.error_details && (
      <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
        {JSON.stringify(mailTestResult.error_details, null, 2)}
      </pre>
    )}
  </div>
)}
```

### Same Pattern for LDAP and NTP
Apply identical pattern to LDAP test button (line 654-656) and NTP test button.

### Requirements for Test to Work
1. **Domain Selection** - Settings page needs a domain selector since test-connection requires domain_id
2. **Config Save First** - Must save/upsert config before testing to get config_id
3. **Display Result** - Show success/fail with details and latency

---

## Phase 7: NetworkScan Filtering + Agent Message

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/NetworkScan.tsx` | Filter networks by domain, add agent required message |

### Changes

1. **Filter networks dropdown by selectedDomainId**
```typescript
const filteredNetworks = networks.filter(n => 
  !selectedDomainId || n.domain_id === selectedDomainId
);
```

2. **Auto-fill IP range from network subnet when network selected**
```typescript
useEffect(() => {
  if (selectedNetworkId) {
    const network = networks.find(n => n.id === selectedNetworkId);
    if (network?.subnet) {
      setIpRange(network.subnet);
    }
  }
}, [selectedNetworkId, networks]);
```

3. **Add agent required message**
Replace simulated scan with clear message:
```jsx
<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    {language === 'ar' 
      ? 'يتطلب الفحص وكيل (Agent) مثبت في الشبكة المحلية. الفحص المباشر من المتصفح غير مدعوم لأسباب أمنية.'
      : 'Network scanning requires an agent installed on your local network. Direct browser scanning is not supported for security reasons.'
    }
  </AlertDescription>
</Alert>
```

---

## Phase 8: ScanAgents Diagnostics Panel

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/ScanAgents.tsx` | Add events panel, last error column |
| `src/hooks/useScanAgents.ts` | Add useAgentEvents hook |

### New Hook
```typescript
export function useAgentEvents(agentId: string) {
  return useQuery({
    queryKey: ['agent_events', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_events')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
  });
}
```

### UI Enhancement
- Add "Last Error" column showing most recent error event
- Add expandable row or dialog showing recent 50 events

---

## Technical Summary

### Files to Create
None - all changes are modifications to existing files.

### Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/LanguageContext.tsx` | Add ~20 new translation keys for both AR/EN |
| `src/components/datacenter/NodeTable.tsx` | Add edit/delete actions with dialogs |
| `src/components/datacenter/VMTable.tsx` | Add edit/delete actions + server linking |
| `src/components/datacenter/ClusterForm.tsx` | Add datacenter selection dropdown |
| `src/components/datacenter/TopologyView.tsx` | Add datacenter level to hierarchy |
| `src/pages/Settings.tsx` | Wire test buttons to edge function with result display |
| `src/pages/NetworkScan.tsx` | Filter networks by domain, add agent message |
| `src/pages/ScanAgents.tsx` | Add diagnostics panel and events display |
| `src/hooks/useScanAgents.ts` | Add useAgentEvents hook |

### No Database Changes Required
All schema and edge functions are already in place from previous implementation.

---

## Implementation Order

1. **LanguageContext.tsx** - Add missing translations (fixes "common.status" issue)
2. **NodeTable.tsx** - Add edit/delete actions
3. **VMTable.tsx** - Add edit/delete + server linking
4. **ClusterForm.tsx** - Add datacenter dropdown
5. **TopologyView.tsx** - Show datacenter level
6. **Settings.tsx** - Wire test buttons with result display
7. **NetworkScan.tsx** - Domain filtering + agent message
8. **ScanAgents.tsx** - Diagnostics panel

---

## Verification Checklist

After implementation:
- [ ] "common.status" shows as "الحالة" / "Status" in NodeTable and VMTable
- [ ] Can edit/delete nodes from Physical tab
- [ ] Can edit/delete VMs from Virtualization tab
- [ ] VM form shows option to link to or create server
- [ ] Cluster form requires datacenter selection
- [ ] TopologyView shows Domain → Datacenter → Cluster → Node → VM
- [ ] Mail test button calls edge function and shows result
- [ ] LDAP test button calls edge function and shows result
- [ ] NTP test button calls edge function and shows result
- [ ] NetworkScan filters networks by selected domain
- [ ] ScanAgents shows last error and recent events
