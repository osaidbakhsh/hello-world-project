import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VMDetailsSectionProps {
  cpuCores?: number;
  ramGb?: number;
  storageGb?: number;
  hypervisorType?: string;
  hypervisorHost?: string;
  vmId?: string;
  templateName?: string;
  isTemplate?: boolean;
  toolsStatus?: string;
  toolsVersion?: string;
  snapshotCount?: number;
  onCpuCoresChange: (value: number) => void;
  onRamGbChange: (value: number) => void;
  onStorageGbChange: (value: number) => void;
  onHypervisorTypeChange: (value: string) => void;
  onHypervisorHostChange: (value: string) => void;
  onVmIdChange: (value: string) => void;
  onTemplateNameChange: (value: string) => void;
  onIsTemplateChange: (value: boolean) => void;
  onToolsStatusChange: (value: string) => void;
  onToolsVersionChange: (value: string) => void;
  onSnapshotCountChange: (value: number) => void;
}

const HYPERVISOR_TYPES = ['VMware vSphere', 'Hyper-V', 'KVM', 'Xen', 'Proxmox', 'OpenStack'];
const TOOLS_STATUS_OPTIONS = ['running', 'stopped', 'not installed', 'needs upgrade', 'unknown'];

export const VMDetailsSection: React.FC<VMDetailsSectionProps> = ({
  cpuCores,
  ramGb,
  storageGb,
  hypervisorType,
  hypervisorHost,
  vmId,
  templateName,
  isTemplate,
  toolsStatus,
  toolsVersion,
  snapshotCount,
  onCpuCoresChange,
  onRamGbChange,
  onStorageGbChange,
  onHypervisorTypeChange,
  onHypervisorHostChange,
  onVmIdChange,
  onTemplateNameChange,
  onIsTemplateChange,
  onToolsStatusChange,
  onToolsVersionChange,
  onSnapshotCountChange,
}) => {
  return (
    <div className="space-y-6">
      {/* VM Resources */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">VM Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="cpuCores">CPU Cores</Label>
              <Input
                id="cpuCores"
                type="number"
                min="1"
                value={cpuCores || ''}
                onChange={(e) => onCpuCoresChange(parseInt(e.target.value) || 0)}
                placeholder="4"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ramGb">RAM (GB)</Label>
              <Input
                id="ramGb"
                type="number"
                min="1"
                value={ramGb || ''}
                onChange={(e) => onRamGbChange(parseInt(e.target.value) || 0)}
                placeholder="8"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="storageGb">Storage (GB)</Label>
              <Input
                id="storageGb"
                type="number"
                min="1"
                value={storageGb || ''}
                onChange={(e) => onStorageGbChange(parseInt(e.target.value) || 0)}
                placeholder="100"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hypervisor Configuration */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hypervisor Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="hypervisorType">Hypervisor Type</Label>
              <Select value={hypervisorType || ''} onValueChange={onHypervisorTypeChange}>
                <SelectTrigger id="hypervisorType" className="mt-1">
                  <SelectValue placeholder="Select hypervisor" />
                </SelectTrigger>
                <SelectContent>
                  {HYPERVISOR_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="hypervisorHost">Hypervisor Host</Label>
              <Input
                id="hypervisorHost"
                value={hypervisorHost || ''}
                onChange={(e) => onHypervisorHostChange(e.target.value)}
                placeholder="Host name or IP"
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="vmId">VM ID / UUID</Label>
              <Input
                id="vmId"
                value={vmId || ''}
                onChange={(e) => onVmIdChange(e.target.value)}
                placeholder="UUID or external ID from hypervisor"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VM Template Configuration */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Template Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="isTemplate"
              checked={isTemplate || false}
              onCheckedChange={onIsTemplateChange}
            />
            <Label htmlFor="isTemplate" className="font-normal cursor-pointer">
              Is Template
            </Label>
          </div>

          {isTemplate && (
            <div className="pt-2 border-t">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={templateName || ''}
                onChange={(e) => onTemplateNameChange(e.target.value)}
                placeholder="Template display name"
                className="mt-1"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tools Status */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hypervisor Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="toolsStatus">Tools Status</Label>
              <Select value={toolsStatus || ''} onValueChange={onToolsStatusChange}>
                <SelectTrigger id="toolsStatus" className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {TOOLS_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="toolsVersion">Tools Version</Label>
              <Input
                id="toolsVersion"
                value={toolsVersion || ''}
                onChange={(e) => onToolsVersionChange(e.target.value)}
                placeholder="e.g., 11.0.1"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Snapshots */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="snapshotCount">Snapshot Count</Label>
            <Input
              id="snapshotCount"
              type="number"
              min="0"
              value={snapshotCount || 0}
              onChange={(e) => onSnapshotCountChange(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Number of snapshots currently held by this VM
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
