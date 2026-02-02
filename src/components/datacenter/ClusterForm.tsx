import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateCluster, useUpdateCluster, useDatacenters } from '@/hooks/useDatacenter';
import { useDomains } from '@/hooks/useSupabaseData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Cluster, ClusterType, StorageType, RFLevel } from '@/types/datacenter';

interface Props {
  domainId?: string;
  editingCluster?: Cluster | null;
  onClose: () => void;
}

const ClusterForm: React.FC<Props> = ({ domainId, editingCluster, onClose }) => {
  const { t, language } = useLanguage();
  const { data: domains } = useDomains();
  const createCluster = useCreateCluster();
  const updateCluster = useUpdateCluster();

  const [selectedDomainId, setSelectedDomainId] = useState(editingCluster?.domain_id || domainId || '');
  const { data: datacenters } = useDatacenters(selectedDomainId);

  const [formData, setFormData] = useState({
    name: editingCluster?.name || '',
    datacenter_id: editingCluster?.datacenter_id || '',
    cluster_type: (editingCluster?.cluster_type as ClusterType) || 'vmware',
    vendor: editingCluster?.vendor || '',
    platform_version: editingCluster?.platform_version || '',
    hypervisor_version: editingCluster?.hypervisor_version || '',
    storage_type: (editingCluster?.storage_type as StorageType) || 'all-flash',
    rf_level: (editingCluster?.rf_level as RFLevel) || 'RF2',
    notes: editingCluster?.notes || '',
  });

  // Reset datacenter when domain changes
  useEffect(() => {
    if (!editingCluster && selectedDomainId !== domainId) {
      setFormData(prev => ({ ...prev, datacenter_id: '' }));
    }
  }, [selectedDomainId, domainId, editingCluster]);

  const handleSubmit = async () => {
    if (editingCluster) {
      await updateCluster.mutateAsync({
        id: editingCluster.id,
        ...formData,
        datacenter_id: formData.datacenter_id || null,
      });
    } else {
      await createCluster.mutateAsync({
        ...formData,
        domain_id: selectedDomainId,
        datacenter_id: formData.datacenter_id || null,
        node_count: 0,
      });
    }
    onClose();
  };

  const clusterTypes: { value: ClusterType; label: string }[] = [
    { value: 'vmware', label: 'VMware vSphere' },
    { value: 'nutanix', label: 'Nutanix AHV' },
    { value: 'hyperv', label: 'Microsoft Hyper-V' },
    { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other' },
  ];

  const storageTypes: { value: StorageType; label: string }[] = [
    { value: 'all-flash', label: 'All-Flash' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'hdd', label: 'HDD' },
  ];

  const rfLevels: { value: RFLevel; label: string }[] = [
    { value: 'RF1', label: 'RF1 (1 copy)' },
    { value: 'RF2', label: 'RF2 (2 copies)' },
    { value: 'RF3', label: 'RF3 (3 copies)' },
    { value: 'N/A', label: language === 'ar' ? 'غير متاح' : 'N/A' },
  ];

  const isPending = createCluster.isPending || updateCluster.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingCluster 
              ? (language === 'ar' ? 'تعديل الكلستر' : 'Edit Cluster')
              : t('datacenter.addCluster')
            }
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Domain Selector - FIRST FIELD */}
          <div className="space-y-2 col-span-2">
            <Label>{t('common.domain')} *</Label>
            <Select 
              value={selectedDomainId} 
              onValueChange={setSelectedDomainId}
              disabled={!!editingCluster}
            >
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

          <div className="space-y-2">
            <Label>{t('common.name')} *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="PRD-CLUSTER-01"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('datacenter.clusterType')}</Label>
            <Select 
              value={formData.cluster_type} 
              onValueChange={(v: ClusterType) => setFormData({ ...formData, cluster_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clusterTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {datacenters && datacenters.length > 0 && (
            <div className="space-y-2">
              <Label>{t('datacenter.datacenter')}</Label>
              <Select 
                value={formData.datacenter_id || 'none'} 
                onValueChange={(v) => setFormData({ ...formData, datacenter_id: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                  {datacenters.map((dc) => (
                    <SelectItem key={dc.id} value={dc.id}>
                      {dc.name} {dc.location && `(${dc.location})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('datacenter.vendor')}</Label>
            <Input
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="Dell / HPE / Nutanix"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('datacenter.platformVersion')}</Label>
            <Input
              value={formData.platform_version}
              onChange={(e) => setFormData({ ...formData, platform_version: e.target.value })}
              placeholder="vSphere 8.0 / AOS 6.5"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('datacenter.hypervisorVersion')}</Label>
            <Input
              value={formData.hypervisor_version}
              onChange={(e) => setFormData({ ...formData, hypervisor_version: e.target.value })}
              placeholder="ESXi 8.0 / AHV 20230302"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('datacenter.storageType')}</Label>
            <Select 
              value={formData.storage_type} 
              onValueChange={(v: StorageType) => setFormData({ ...formData, storage_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {storageTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('datacenter.rfLevel')}</Label>
            <Select 
              value={formData.rf_level} 
              onValueChange={(v: RFLevel) => setFormData({ ...formData, rf_level: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rfLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 space-y-2">
            <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!formData.name || !selectedDomainId || isPending}
          >
            {isPending 
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
              : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClusterForm;