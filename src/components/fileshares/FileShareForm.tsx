import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDomains } from '@/hooks/useSupabaseData';
import { useScanAgents } from '@/hooks/useScanAgents';
import { useFileShare, useFileShareMutations } from '@/hooks/useFileShares';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { FileShareFormData, ShareType, ScanMode } from '@/types/fileshares';

interface FileShareFormProps {
  editId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const FileShareForm: React.FC<FileShareFormProps> = ({ editId, onSuccess, onCancel }) => {
  const { t } = useLanguage();
  const { data: domains } = useDomains();
  const { createFileShare, updateFileShare } = useFileShareMutations();
  const { data: existingShare, isLoading: isLoadingShare } = useFileShare(editId || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FileShareFormData>({
    domain_id: '',
    name: '',
    share_type: 'SMB',
    path: '',
    scan_mode: 'DIRECT',
    agent_id: null,
    credential_vault_id: null,
    scan_depth: 10,
    exclude_patterns: [],
    schedule_cron: null,
    maintenance_window_id: null,
    is_enabled: true,
  });
  const [excludePatternsText, setExcludePatternsText] = useState('');

  // Load agents for selected domain
  const { data: agents } = useScanAgents(formData.domain_id || undefined);

  // Populate form when editing
  useEffect(() => {
    if (editId && existingShare) {
      setFormData({
        domain_id: existingShare.domain_id,
        name: existingShare.name,
        share_type: existingShare.share_type,
        path: existingShare.path,
        scan_mode: existingShare.scan_mode,
        agent_id: existingShare.agent_id,
        credential_vault_id: existingShare.credential_vault_id,
        scan_depth: existingShare.scan_depth,
        exclude_patterns: existingShare.exclude_patterns || [],
        schedule_cron: existingShare.schedule_cron,
        maintenance_window_id: existingShare.maintenance_window_id,
        is_enabled: existingShare.is_enabled,
      });
      setExcludePatternsText((existingShare.exclude_patterns || []).join('\n'));
    }
  }, [editId, existingShare]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.domain_id || !formData.name || !formData.path) {
      toast({ title: t('common.error'), description: t('common.requiredFields'), variant: 'destructive' });
      return;
    }

    if (formData.scan_mode === 'AGENT' && !formData.agent_id) {
      toast({ title: t('common.error'), description: t('fileShares.selectAgent'), variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const dataToSubmit = {
      ...formData,
      exclude_patterns: excludePatternsText.split('\n').filter(p => p.trim()),
      agent_id: formData.scan_mode === 'AGENT' ? formData.agent_id : null,
    };

    try {
      if (editId) {
        const { error } = await updateFileShare(editId, dataToSubmit);
        if (error) throw error;
        toast({ title: t('common.success'), description: t('fileShares.updated') });
      } else {
        const { error } = await createFileShare(dataToSubmit);
        if (error) throw error;
        toast({ title: t('common.success'), description: t('fileShares.created') });
      }
      onSuccess();
    } catch (e: any) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (editId && isLoadingShare) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Domain */}
        <div className="space-y-2">
          <Label>{t('dashboard.domain')} *</Label>
          <Select 
            value={formData.domain_id} 
            onValueChange={(v) => setFormData(p => ({ ...p, domain_id: v, agent_id: null }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('domainSummary.selectDomain')} />
            </SelectTrigger>
            <SelectContent>
              {domains.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label>{t('fileShares.name')} *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
            placeholder={t('fileShares.namePlaceholder')}
          />
        </div>

        {/* Type */}
        <div className="space-y-2">
          <Label>{t('fileShares.type')} *</Label>
          <Select 
            value={formData.share_type} 
            onValueChange={(v: ShareType) => setFormData(p => ({ ...p, share_type: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SMB">{t('fileShares.type.smb')}</SelectItem>
              <SelectItem value="NFS">{t('fileShares.type.nfs')}</SelectItem>
              <SelectItem value="LOCAL">{t('fileShares.type.local')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Path */}
        <div className="space-y-2">
          <Label>{t('fileShares.path')} *</Label>
          <Input
            value={formData.path}
            onChange={(e) => setFormData(p => ({ ...p, path: e.target.value }))}
            placeholder="\\\\server\\share or /mnt/share"
            className="font-mono"
          />
        </div>

        {/* Scan Mode */}
        <div className="space-y-2">
          <Label>{t('fileShares.scanMode')} *</Label>
          <Select 
            value={formData.scan_mode} 
            onValueChange={(v: ScanMode) => setFormData(p => ({ ...p, scan_mode: v, agent_id: null }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DIRECT">{t('fileShares.scanMode.direct')}</SelectItem>
              <SelectItem value="AGENT">{t('fileShares.scanMode.agent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Agent (only if scan mode is AGENT) */}
        {formData.scan_mode === 'AGENT' && (
          <div className="space-y-2">
            <Label>{t('fileShares.agent')} *</Label>
            <Select 
              value={formData.agent_id || ''} 
              onValueChange={(v) => setFormData(p => ({ ...p, agent_id: v }))}
              disabled={!formData.domain_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fileShares.selectAgent')} />
              </SelectTrigger>
              <SelectContent>
                {agents.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">{t('agents.noAgents')}</div>
                ) : (
                  agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${a.status === 'ONLINE' ? 'bg-green-500' : 'bg-muted'}`} />
                        {a.name}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Scan Depth */}
        <div className="space-y-2">
          <Label>{t('fileShares.scanDepth')}</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={formData.scan_depth}
            onChange={(e) => setFormData(p => ({ ...p, scan_depth: parseInt(e.target.value) || 10 }))}
          />
        </div>

        {/* Enabled */}
        <div className="flex items-center justify-between">
          <Label>{t('common.enabled')}</Label>
          <Switch
            checked={formData.is_enabled}
            onCheckedChange={(v) => setFormData(p => ({ ...p, is_enabled: v }))}
          />
        </div>
      </div>

      {/* Exclude Patterns */}
      <div className="space-y-2">
        <Label>{t('fileShares.excludePatterns')}</Label>
        <Textarea
          value={excludePatternsText}
          onChange={(e) => setExcludePatternsText(e.target.value)}
          placeholder="*.tmp&#10;*.log&#10;Thumbs.db"
          className="font-mono text-sm h-24"
        />
        <p className="text-xs text-muted-foreground">{t('fileShares.excludePatternsHint')}</p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
          {editId ? t('common.save') : t('common.add')}
        </Button>
      </div>
    </form>
  );
};

export default FileShareForm;
