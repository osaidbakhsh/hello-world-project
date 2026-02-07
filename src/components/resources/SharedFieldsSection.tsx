import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ResourceType, ResourceStatus, CriticalityLevel } from '@/types/resources';

interface SharedFieldsProps {
  resourceType: ResourceType;
  name: string;
  hostname?: string;
  primaryIp?: string;
  os?: string;
  status: ResourceStatus;
  criticality?: CriticalityLevel;
  environment?: string;
  ownerTeam?: string;
  notes?: string;
  tags?: string[];
  onNameChange: (value: string) => void;
  onHostnameChange: (value: string) => void;
  onPrimaryIpChange: (value: string) => void;
  onOsChange: (value: string) => void;
  onStatusChange: (value: ResourceStatus) => void;
  onCriticalityChange: (value: CriticalityLevel) => void;
  onEnvironmentChange: (value: string) => void;
  onOwnerTeamChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onTagsChange: (value: string[]) => void;
}

const STATUS_OPTIONS: ResourceStatus[] = ['online', 'offline', 'maintenance', 'degraded', 'unknown', 'decommissioned'];
const CRITICALITY_LEVELS: CriticalityLevel[] = ['critical', 'high', 'medium', 'low'];
const ENVIRONMENT_OPTIONS = ['production', 'staging', 'testing', 'development'];
const OS_OPTIONS = [
  'Windows Server 2022',
  'Windows Server 2019',
  'Ubuntu 22.04',
  'Ubuntu 20.04',
  'CentOS 8',
  'CentOS 7',
  'Red Hat 8',
  'Red Hat 7',
];

export const SharedFieldsSection: React.FC<SharedFieldsProps> = ({
  resourceType,
  name,
  hostname,
  primaryIp,
  os,
  status,
  criticality,
  environment,
  ownerTeam,
  notes,
  onNameChange,
  onHostnameChange,
  onPrimaryIpChange,
  onOsChange,
  onStatusChange,
  onCriticalityChange,
  onEnvironmentChange,
  onOwnerTeamChange,
  onNotesChange,
}) => {
  const { t } = useLanguage();
  
  // Determine if this is a physical server
  const isPhysicalServer = resourceType === 'physical_server';
  const isVM = resourceType === 'vm';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Name (required) */}
        <div className="col-span-2">
          <Label htmlFor="name" className="font-semibold">
            {t('resources.name')} *
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={
              isPhysicalServer ? 'e.g., PROD-SERVER-01' : isVM ? 'e.g., web-prod-01' : t('resources.name')
            }
            className="mt-1"
          />
        </div>

        {/* Hostname */}
        <div>
          <Label htmlFor="hostname">{t('resources.hostname')}</Label>
          <Input
            id="hostname"
            value={hostname || ''}
            onChange={(e) => onHostnameChange(e.target.value)}
            placeholder={isPhysicalServer ? 'server.corp.local' : 'vm.corp.local'}
            className="mt-1"
          />
        </div>

        {/* Primary IP */}
        <div>
          <Label htmlFor="ip">{t('resources.ip')}</Label>
          <Input
            id="ip"
            value={primaryIp || ''}
            onChange={(e) => onPrimaryIpChange(e.target.value)}
            placeholder="192.168.1.10"
            className="mt-1"
          />
        </div>

        {/* Operating System */}
        <div className="col-span-2">
          <Label htmlFor="os">{t('resources.os')}</Label>
          <div className="mt-1 flex gap-2">
            <Input
              id="os"
              value={os || ''}
              onChange={(e) => onOsChange(e.target.value)}
              placeholder="Windows Server 2022"
              list="os-options"
              className="flex-1"
            />
          </div>
          <datalist id="os-options">
            {OS_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        {/* Status */}
        <div>
          <Label htmlFor="status">{t('resources.status')}</Label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger id="status" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`resources.${s}`) || s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Criticality */}
        <div>
          <Label htmlFor="criticality">{t('resources.criticality')}</Label>
          <Select value={criticality || ''} onValueChange={onCriticalityChange}>
            <SelectTrigger id="criticality" className="mt-1">
              <SelectValue placeholder={t('resources.selectLevel')} />
            </SelectTrigger>
            <SelectContent>
              {CRITICALITY_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {t(`resources.${level}`) || level.charAt(0).toUpperCase() + level.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Environment */}
        <div>
          <Label htmlFor="environment">{t('resources.environment')}</Label>
          <Select value={environment || ''} onValueChange={onEnvironmentChange}>
            <SelectTrigger id="environment" className="mt-1">
              <SelectValue placeholder={t('resources.selectEnvironment')} />
            </SelectTrigger>
            <SelectContent>
              {ENVIRONMENT_OPTIONS.map((env) => (
                <SelectItem key={env} value={env}>
                  {t(`resources.env.${env}`) || env.charAt(0).toUpperCase() + env.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Owner Team */}
        <div>
          <Label htmlFor="ownerTeam">{t('resources.owner')}</Label>
          <Input
            id="ownerTeam"
            value={ownerTeam || ''}
            onChange={(e) => onOwnerTeamChange(e.target.value)}
            placeholder={t('resources.ownerPlaceholder')}
            className="mt-1"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">{t('resources.notes')}</Label>
        <Textarea
          id="notes"
          value={notes || ''}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={t('resources.notesPlaceholder')}
          className="mt-1"
          rows={3}
        />
      </div>
    </div>
  );
};
