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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { NetworkV2 } from '@/types/resources';

interface ServerDetailsSectionProps {
  networkId?: string;
  networks: NetworkV2[];
  cpu?: string;
  ram?: string;
  diskSpace?: string;
  vendor?: string;
  model?: string;
  serialNumber?: string;
  warrantyEnd?: string;
  eoDate?: string;
  eosDate?: string;
  purchaseDate?: string;
  beneficiaryDepartment?: string;
  primaryApplication?: string;
  businessOwner?: string;
  isBackedUpByVeeam?: boolean;
  backupFrequency?: string;
  backupJobName?: string;
  contractId?: string;
  supportLevel?: string;
  serverRole?: string[];
  rpoHours?: string;
  rtoHours?: string;
  lastRestoreTest?: string;
  responsibleUser?: string;
  onNetworkIdChange: (value: string) => void;
  onCpuChange: (value: string) => void;
  onRamChange: (value: string) => void;
  onDiskSpaceChange: (value: string) => void;
  onVendorChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onSerialNumberChange: (value: string) => void;
  onWarrantyEndChange: (value: string) => void;
  onEoDateChange: (value: string) => void;
  onEosDateChange: (value: string) => void;
  onPurchaseDateChange: (value: string) => void;
  onBeneficiaryDepartmentChange: (value: string) => void;
  onPrimaryApplicationChange: (value: string) => void;
  onBusinessOwnerChange: (value: string) => void;
  onIsBackedUpByVeeamChange: (value: boolean) => void;
  onBackupFrequencyChange: (value: string) => void;
  onBackupJobNameChange: (value: string) => void;
  onContractIdChange: (value: string) => void;
  onSupportLevelChange: (value: string) => void;
  onServerRoleChange: (value: string[]) => void;
  onRpoHoursChange: (value: string) => void;
  onRtoHoursChange: (value: string) => void;
  onLastRestoreTestChange: (value: string) => void;
  onResponsibleUserChange: (value: string) => void;
}

const SUPPORT_LEVELS = ['standard', 'premium', 'enterprise'];
const SERVER_ROLES = ['web', 'app', 'database', 'cache', 'storage', 'proxy', 'firewall', 'load-balancer', 'dns', 'dhcp'];
const BACKUP_FREQUENCIES = ['none', 'hourly', 'daily', 'weekly', 'monthly'];

export const ServerDetailsSection: React.FC<ServerDetailsSectionProps> = ({
  networkId,
  networks,
  cpu,
  ram,
  diskSpace,
  vendor,
  model,
  serialNumber,
  warrantyEnd,
  eoDate,
  eosDate,
  purchaseDate,
  beneficiaryDepartment,
  primaryApplication,
  businessOwner,
  isBackedUpByVeeam,
  backupFrequency,
  backupJobName,
  contractId,
  supportLevel,
  serverRole,
  rpoHours,
  rtoHours,
  lastRestoreTest,
  responsibleUser,
  onNetworkIdChange,
  onCpuChange,
  onRamChange,
  onDiskSpaceChange,
  onVendorChange,
  onModelChange,
  onSerialNumberChange,
  onWarrantyEndChange,
  onEoDateChange,
  onEosDateChange,
  onPurchaseDateChange,
  onBeneficiaryDepartmentChange,
  onPrimaryApplicationChange,
  onBusinessOwnerChange,
  onIsBackedUpByVeeamChange,
  onBackupFrequencyChange,
  onBackupJobNameChange,
  onContractIdChange,
  onSupportLevelChange,
  onServerRoleChange,
  onRpoHoursChange,
  onRtoHoursChange,
  onLastRestoreTestChange,
  onResponsibleUserChange,
}) => {
  if (!networks.length) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No networks available. Please select a domain first or create a network.
        </AlertDescription>
      </Alert>
    );
  }

  const currentRoles = serverRole || [];
  const toggleServerRole = (role: string) => {
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    onServerRoleChange(newRoles);
  };

  return (
    <div className="space-y-6">
      {/* Network Selection (Required) */}
      <div>
        <Label htmlFor="network" className="font-semibold text-base">
          Network *
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Physical server must be assigned to a network
        </p>
        <Select value={networkId || ''} onValueChange={onNetworkIdChange}>
          <SelectTrigger id="network" className="mt-2">
            <SelectValue placeholder="Select network" />
          </SelectTrigger>
          <SelectContent>
            {networks.map((net) => (
              <SelectItem key={net.id} value={net.id}>
                {net.name} {net.cidr ? `(${net.cidr})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* System Specifications */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">System Specifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="cpu">CPU</Label>
              <Input
                id="cpu"
                value={cpu || ''}
                onChange={(e) => onCpuChange(e.target.value)}
                placeholder="e.g., 16 cores"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ram">RAM</Label>
              <Input
                id="ram"
                value={ram || ''}
                onChange={(e) => onRamChange(e.target.value)}
                placeholder="e.g., 128 GB"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="disk">Disk Space</Label>
              <Input
                id="disk"
                value={diskSpace || ''}
                onChange={(e) => onDiskSpaceChange(e.target.value)}
                placeholder="e.g., 2 TB"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset Lifecycle */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Asset Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                value={vendor || ''}
                onChange={(e) => onVendorChange(e.target.value)}
                placeholder="e.g., Dell"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model || ''}
                onChange={(e) => onModelChange(e.target.value)}
                placeholder="e.g., PowerEdge R750"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="serial">Serial Number</Label>
              <Input
                id="serial"
                value={serialNumber || ''}
                onChange={(e) => onSerialNumberChange(e.target.value)}
                placeholder="Serial number"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="purchase">Purchase Date</Label>
              <Input
                id="purchase"
                type="date"
                value={purchaseDate || ''}
                onChange={(e) => onPurchaseDateChange(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="warranty">Warranty End</Label>
              <Input
                id="warranty"
                type="date"
                value={warrantyEnd || ''}
                onChange={(e) => onWarrantyEndChange(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="eol">EOL Date</Label>
              <Input
                id="eol"
                type="date"
                value={eoDate || ''}
                onChange={(e) => onEoDateChange(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="eos">EOS Date</Label>
              <Input
                id="eos"
                type="date"
                value={eosDate || ''}
                onChange={(e) => onEosDateChange(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Veeam Backup Configuration */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Backup Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="veeam"
              checked={isBackedUpByVeeam || false}
              onCheckedChange={onIsBackedUpByVeeamChange}
            />
            <Label htmlFor="veeam" className="font-normal cursor-pointer">
              Backed up by Veeam
            </Label>
          </div>

          {isBackedUpByVeeam && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <Label htmlFor="frequency">Backup Frequency</Label>
                <Select value={backupFrequency || 'none'} onValueChange={onBackupFrequencyChange}>
                  <SelectTrigger id="frequency" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKUP_FREQUENCIES.map((freq) => (
                      <SelectItem key={freq} value={freq}>
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="jobName">Job Name</Label>
                <Input
                  id="jobName"
                  value={backupJobName || ''}
                  onChange={(e) => onBackupJobNameChange(e.target.value)}
                  placeholder="Veeam job name"
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disaster Recovery Configuration */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Disaster Recovery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rpo">RPO (hours)</Label>
              <Input
                id="rpo"
                type="number"
                value={rpoHours || ''}
                onChange={(e) => onRpoHoursChange(e.target.value)}
                placeholder="Recovery Point Objective"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rto">RTO (hours)</Label>
              <Input
                id="rto"
                type="number"
                value={rtoHours || ''}
                onChange={(e) => onRtoHoursChange(e.target.value)}
                placeholder="Recovery Time Objective"
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="lastRestore">Last Restore Test</Label>
              <Input
                id="lastRestore"
                type="date"
                value={lastRestoreTest || ''}
                onChange={(e) => onLastRestoreTestChange(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Context */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Business Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="department">Beneficiary Department</Label>
              <Input
                id="department"
                value={beneficiaryDepartment || ''}
                onChange={(e) => onBeneficiaryDepartmentChange(e.target.value)}
                placeholder="e.g., Sales"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="application">Primary Application</Label>
              <Input
                id="application"
                value={primaryApplication || ''}
                onChange={(e) => onPrimaryApplicationChange(e.target.value)}
                placeholder="e.g., CRM"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="businessOwner">Business Owner</Label>
              <Input
                id="businessOwner"
                value={businessOwner || ''}
                onChange={(e) => onBusinessOwnerChange(e.target.value)}
                placeholder="Owner name or email"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="responsible">Responsible User</Label>
              <Input
                id="responsible"
                value={responsibleUser || ''}
                onChange={(e) => onResponsibleUserChange(e.target.value)}
                placeholder="Primary contact"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Contract */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Support Contract</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="contract">Contract ID</Label>
              <Input
                id="contract"
                value={contractId || ''}
                onChange={(e) => onContractIdChange(e.target.value)}
                placeholder="Support contract ID"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="support">Support Level</Label>
              <Select value={supportLevel || 'standard'} onValueChange={onSupportLevelChange}>
                <SelectTrigger id="support" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Roles */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Server Roles</CardTitle>
          <CardDescription>Select all applicable roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {SERVER_ROLES.map((role) => (
              <div key={role} className="flex items-center gap-2">
                <Checkbox
                  id={`role-${role}`}
                  checked={currentRoles.includes(role)}
                  onCheckedChange={() => toggleServerRole(role)}
                />
                <Label
                  htmlFor={`role-${role}`}
                  className="font-normal cursor-pointer text-sm"
                >
                  {role.charAt(0).toUpperCase() + role.slice(1).replace('-', ' ')}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
