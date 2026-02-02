

# Comprehensive Enhancement Plan

## Overview
This plan addresses 4 major feature requests/issues:

1. **Mail Settings Test Issue** - Test shows "success" with fake data because it only validates format, not actual SMTP connection. Need to add "Send Test Email" feature.
2. **Datacenter Completeness Translations** - `datacenter.nodesWithSerial` and `datacenter.vmsLinked` not translated in Arabic
3. **Cluster Management Enhancement** - Add cluster table with edit/delete, domain selector in cluster form
4. **Procurement Module** - Full domain-scoped procurement system with PDF quotations

---

## Phase 1: Fix Mail Settings Test - Add Real Email Test

### Current Issue
The test-connection edge function only validates configuration format (host/port/email regex) but does NOT actually connect to SMTP or send an email. It reports "success" even with fake data.

### Solution
Create a new edge function `send-test-email` that:
1. Actually connects to the SMTP server
2. Attempts to send a real test email
3. Returns success/failure based on actual connection

### Files to Create
| File | Description |
|------|-------------|
| `supabase/functions/send-test-email/index.ts` | New edge function to send actual test email |

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Add "Send Test Email" button with recipient field |
| `src/contexts/LanguageContext.tsx` | Add translations for test email feature |

### Edge Function Implementation
```typescript
// send-test-email/index.ts
- Accepts: { config_id, recipient_email, domain_id }
- Fetches mail_configs from database
- Uses Deno's SMTP library to connect
- Sends actual test email
- Returns { success, message, error_details }
```

### UI Enhancement
```jsx
// Add in Settings.tsx Mail section
<div className="space-y-2">
  <Label>{t('settings.testRecipient')}</Label>
  <Input
    type="email"
    placeholder="test@example.com"
    value={testRecipientEmail}
    onChange={(e) => setTestRecipientEmail(e.target.value)}
  />
</div>
<Button onClick={handleSendTestEmail} disabled={isSendingTestEmail || !testRecipientEmail}>
  {isSendingTestEmail ? <Loader2 className="animate-spin" /> : <Mail />}
  {t('settings.sendTestEmail')}
</Button>
```

---

## Phase 2: Fix Datacenter Completeness Translations

### Current Issue
In `DatacenterOverview.tsx`, the completeness section uses translation keys that are missing in Arabic:
- `datacenter.nodesWithSerial` - Shows "datacenter.nodesWithSerial" instead of translated text
- `datacenter.vmsLinked` - Shows "datacenter.vmsLinked" instead of translated text

### Root Cause
The keys exist in English but are missing in Arabic translation section.

### Files to Modify
| File | Change |
|------|--------|
| `src/contexts/LanguageContext.tsx` | Add missing Arabic translations |
| `src/components/datacenter/DatacenterOverview.tsx` | Improve completeness display with actual data |

### Translation Additions
```javascript
// Arabic translations to add
'datacenter.nodesWithSerial': 'النودات مع الرقم التسلسلي',
'datacenter.vmsLinked': 'الأجهزة الافتراضية المرتبطة',
'datacenter.completenessDesc': 'مستوى اكتمال بيانات البنية التحتية',
```

### Enhance Completeness Card
Calculate actual completeness metrics:
- Nodes with serial number count / Total nodes
- VMs linked to servers count / Total VMs
- Display as progress bars with percentages

---

## Phase 3: Cluster Management Enhancement

### Current Issue
1. No cluster list table with edit/delete actions
2. When creating a cluster, no domain selector - uses parent domain only
3. Datacenter dropdown should filter by selected domain

### Solution
1. Create `ClusterTable.tsx` component with full CRUD
2. Add domain selector as first field in ClusterForm
3. Filter datacenters by selected domain

### Files to Create
| File | Description |
|------|-------------|
| `src/components/datacenter/ClusterTable.tsx` | Table with edit/delete for clusters |

### Files to Modify
| File | Change |
|------|--------|
| `src/components/datacenter/ClusterForm.tsx` | Add domain selector, filter datacenters by domain |
| `src/pages/Datacenter.tsx` | Add Clusters tab to show ClusterTable |
| `src/hooks/useDatacenter.ts` | Add useUpdateCluster, useDeleteCluster (already exist) |
| `src/contexts/LanguageContext.tsx` | Add cluster-related translations |

### ClusterForm Enhancement
```jsx
// Add domain selector as first field
<div className="space-y-2">
  <Label>{t('common.domain')} *</Label>
  <Select value={selectedDomainId} onValueChange={handleDomainChange}>
    <SelectTrigger>
      <SelectValue placeholder={t('common.selectDomain')} />
    </SelectTrigger>
    <SelectContent>
      {domains?.map((d) => (
        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

// Datacenters filtered by domain
const filteredDatacenters = datacenters?.filter(dc => dc.domain_id === selectedDomainId);
```

### ClusterTable Component
```typescript
// Similar structure to DatacenterTable
- Display clusters with: Name, Type, Datacenter, Nodes, VMs, Actions
- Edit dialog with full form
- Delete confirmation with check for linked nodes
```

---

## Phase 4: Procurement Module (Full Implementation)

### Overview
Complete procurement system with:
- Domain-scoped requests
- Multiple items per request
- PDF quotation uploads
- Status workflow
- Activity audit log
- Reporting & price comparison

### Database Schema

#### Tables to Create

**1. procurement_requests**
```sql
CREATE TABLE procurement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES domains(id) ON DELETE CASCADE NOT NULL,
  request_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft','submitted','under_review','approved','rejected','ordered','received','closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  currency text DEFAULT 'SAR',
  needed_by date,
  created_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**2. procurement_request_items**
```sql
CREATE TABLE procurement_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES procurement_requests(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'pcs',
  specs text,
  estimated_unit_price numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**3. procurement_quotations**
```sql
CREATE TABLE procurement_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES procurement_requests(id) ON DELETE CASCADE NOT NULL,
  vendor_name text NOT NULL,
  quotation_ref text,
  quote_date date,
  valid_until date,
  subtotal numeric,
  tax numeric,
  shipping numeric,
  discount numeric,
  total numeric,
  currency text DEFAULT 'SAR',
  file_path text NOT NULL,
  original_filename text NOT NULL,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
```

**4. procurement_activity_logs**
```sql
CREATE TABLE procurement_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES procurement_requests(id) ON DELETE CASCADE NOT NULL,
  actor_profile_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
```

### RLS Policies
```sql
-- Read access: domain members only
CREATE POLICY "Domain members can view procurement requests"
ON procurement_requests FOR SELECT
USING (is_super_admin() OR can_access_domain(domain_id));

-- Insert: domain members can create
CREATE POLICY "Domain members can create requests"
ON procurement_requests FOR INSERT
WITH CHECK (is_admin() OR can_access_domain(domain_id));

-- Update: creator can edit draft, domain admin can change status
CREATE POLICY "Request update policy"
ON procurement_requests FOR UPDATE
USING (
  is_super_admin() 
  OR is_domain_admin(domain_id)
  OR (status = 'draft' AND created_by = get_my_profile_id())
);

-- Delete: creator or domain admin only
CREATE POLICY "Request delete policy"
ON procurement_requests FOR DELETE
USING (
  is_super_admin() 
  OR is_domain_admin(domain_id)
  OR (status = 'draft' AND created_by = get_my_profile_id())
);
```

### Storage Bucket
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('procurement-quotations', 'procurement-quotations', false);

-- Storage RLS
CREATE POLICY "Authenticated users can upload quotations"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'procurement-quotations');

CREATE POLICY "Domain members can view quotations"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'procurement-quotations');
```

### Files to Create

| File | Description |
|------|-------------|
| `src/pages/Procurement.tsx` | Main procurement list page |
| `src/pages/ProcurementDetail.tsx` | Request detail with items, quotations, approval |
| `src/pages/ProcurementCreate.tsx` | Wizard to create new request |
| `src/components/procurement/ProcurementForm.tsx` | Request form component |
| `src/components/procurement/ProcurementItemsTable.tsx` | Items table with inline edit |
| `src/components/procurement/QuotationCard.tsx` | Display quotation with preview/download |
| `src/components/procurement/QuotationUpload.tsx` | Upload PDF with metadata |
| `src/components/procurement/PriceComparison.tsx` | Compare vendors side-by-side |
| `src/components/procurement/ActivityTimeline.tsx` | Show audit history |
| `src/hooks/useProcurement.ts` | React Query hooks for procurement |

### Files to Modify
| File | Change |
|------|--------|
| `src/App.tsx` | Add procurement routes |
| `src/components/layout/Sidebar.tsx` | Add procurement menu item |
| `src/contexts/LanguageContext.tsx` | Add all procurement translations |

### Route Structure
```typescript
// App.tsx
<Route path="/procurement" element={<Procurement />} />
<Route path="/procurement/new" element={<ProcurementCreate />} />
<Route path="/procurement/:id" element={<ProcurementDetail />} />
```

### Sidebar Menu Item
```typescript
// Add to allMenuItems in Sidebar.tsx
{ 
  id: 'procurement', 
  path: '/procurement', 
  icon: ShoppingCart, 
  label: 'nav.procurement',
  adminOnly: false // All domain members can access
},
```

### UI Flow

**1. List Page (`/procurement`)**
- Domain selector (required)
- Status filter tabs: All, Draft, Pending, Approved, Rejected
- Search by request number/title
- Table columns: #, Title, Status, Priority, Items Count, Total Est., Created, Actions
- "New Request" button

**2. Create Page (`/procurement/new`)**
- Step 1: Basic Info (domain, title, description, priority, needed_by)
- Step 2: Items (dynamic table with add/remove)
- Step 3: Quotations (optional PDF uploads)
- Step 4: Review & Submit

**3. Detail Page (`/procurement/:id`)**
- Header with status badge, actions
- Info section (title, description, dates)
- Items table (read-only or editable if draft)
- Quotations section with:
  - Upload button
  - Cards for each quotation (vendor, total, preview, download)
  - Price comparison table
- Approval actions (for domain_admin):
  - Approve button
  - Reject button (with reason dialog)
  - Status transition buttons
- Activity timeline

### Translations
```javascript
// Arabic
'nav.procurement': 'المشتريات',
'procurement.title': 'طلبات المشتريات',
'procurement.subtitle': 'إدارة طلبات الشراء والعروض',
'procurement.newRequest': 'طلب جديد',
'procurement.requestNumber': 'رقم الطلب',
'procurement.status.draft': 'مسودة',
'procurement.status.submitted': 'مُقدم',
'procurement.status.under_review': 'قيد المراجعة',
'procurement.status.approved': 'موافق عليه',
'procurement.status.rejected': 'مرفوض',
'procurement.status.ordered': 'تم الطلب',
'procurement.status.received': 'تم الاستلام',
'procurement.status.closed': 'مغلق',
'procurement.priority.low': 'منخفض',
'procurement.priority.medium': 'متوسط',
'procurement.priority.high': 'عالي',
'procurement.priority.urgent': 'عاجل',
'procurement.items': 'العناصر',
'procurement.addItem': 'إضافة عنصر',
'procurement.itemName': 'اسم العنصر',
'procurement.quantity': 'الكمية',
'procurement.unit': 'الوحدة',
'procurement.specs': 'المواصفات',
'procurement.estimatedPrice': 'السعر التقديري',
'procurement.quotations': 'عروض الأسعار',
'procurement.uploadQuotation': 'رفع عرض سعر',
'procurement.vendorName': 'اسم المورد',
'procurement.quotationRef': 'مرجع العرض',
'procurement.quoteDate': 'تاريخ العرض',
'procurement.validUntil': 'صالح حتى',
'procurement.subtotal': 'المجموع الفرعي',
'procurement.tax': 'الضريبة',
'procurement.shipping': 'الشحن',
'procurement.discount': 'الخصم',
'procurement.total': 'الإجمالي',
'procurement.approve': 'موافقة',
'procurement.reject': 'رفض',
'procurement.rejectionReason': 'سبب الرفض',
'procurement.priceComparison': 'مقارنة الأسعار',
'procurement.lowestPrice': 'أقل سعر',
'procurement.activity': 'سجل النشاط',
'procurement.neededBy': 'مطلوب بتاريخ',
'procurement.submit': 'تقديم الطلب',
'procurement.saveDraft': 'حفظ كمسودة',
'procurement.downloadPdf': 'تحميل PDF',
'procurement.previewPdf': 'معاينة PDF',
'procurement.noQuotations': 'لم يتم رفع عروض أسعار بعد',
'procurement.confirmSubmit': 'هل تريد تقديم هذا الطلب؟ لن تتمكن من التعديل بعد التقديم.',
'procurement.confirmReject': 'هل تريد رفض هذا الطلب؟',
```

---

## Implementation Order

1. **Database Migrations** (Phase 4) - Create procurement tables + storage bucket
2. **Translations** (Phases 1-4) - Add all missing translations
3. **Mail Test Enhancement** (Phase 1) - Create edge function + UI
4. **Datacenter Completeness** (Phase 2) - Fix translations + enhance display
5. **Cluster Management** (Phase 3) - Create table + enhance form
6. **Procurement UI** (Phase 4) - Build all components and pages

---

## Technical Notes

### SMTP Test Limitations
Real SMTP testing from Deno Edge Functions is possible but:
- May be blocked by some SMTP servers due to cloud IP reputation
- Gmail requires App Passwords or OAuth
- Microsoft 365 may require modern auth

The edge function should:
1. Try to establish TCP connection
2. If successful, attempt SMTP handshake
3. If credentials provided, try authentication
4. Send test email if all steps pass

### Procurement Security
- All RLS enforced at database level
- Frontend hides actions based on role but backend validates
- Status transitions validated:
  - draft → submitted (creator only)
  - submitted → under_review → approved/rejected (domain_admin only)
  - approved → ordered → received → closed (domain_admin only)

### PDF Storage Security
- Private bucket (not public)
- Access via signed URLs only
- Files organized by: `{domain_id}/{request_id}/{timestamp}_{filename}.pdf`
- Max file size: 20MB (enforce in frontend + edge function)

---

## Files Summary

### Files to Create
| File | Description |
|------|-------------|
| `supabase/functions/send-test-email/index.ts` | SMTP test email function |
| `src/components/datacenter/ClusterTable.tsx` | Cluster list with CRUD |
| `src/pages/Procurement.tsx` | Procurement list page |
| `src/pages/ProcurementDetail.tsx` | Request detail page |
| `src/pages/ProcurementCreate.tsx` | Create request wizard |
| `src/components/procurement/ProcurementForm.tsx` | Request form |
| `src/components/procurement/ProcurementItemsTable.tsx` | Items table |
| `src/components/procurement/QuotationCard.tsx` | Quotation display |
| `src/components/procurement/QuotationUpload.tsx` | PDF upload |
| `src/components/procurement/PriceComparison.tsx` | Vendor comparison |
| `src/components/procurement/ActivityTimeline.tsx` | Audit log |
| `src/hooks/useProcurement.ts` | React Query hooks |

### Files to Modify
| File | Changes |
|------|---------|
| `src/contexts/LanguageContext.tsx` | Add ~100 new translation keys |
| `src/pages/Settings.tsx` | Add send test email feature |
| `src/components/datacenter/ClusterForm.tsx` | Add domain selector |
| `src/components/datacenter/DatacenterOverview.tsx` | Improve completeness display |
| `src/pages/Datacenter.tsx` | Add Clusters tab |
| `src/App.tsx` | Add procurement routes |
| `src/components/layout/Sidebar.tsx` | Add procurement menu |

### Database Migrations
1. Create procurement_requests table
2. Create procurement_request_items table
3. Create procurement_quotations table
4. Create procurement_activity_logs table
5. Add RLS policies for all tables
6. Create procurement-quotations storage bucket
7. Add storage RLS policies
8. Create request_number sequence function

