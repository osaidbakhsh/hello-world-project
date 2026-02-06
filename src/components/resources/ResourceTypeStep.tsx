import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Server, Monitor, Box, Database, Container, Zap } from 'lucide-react';
import type { ResourceType } from '@/types/resources';
import { cn } from '@/lib/utils';

interface ResourceTypeStepProps {
  selectedType: ResourceType;
  onTypeSelect: (type: ResourceType) => void;
}

interface TypeOption {
  value: ResourceType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const typeOptions: TypeOption[] = [
  {
    value: 'physical_server',
    label: 'Physical Server',
    description: 'Bare metal servers, appliances, network hardware',
    icon: <Server className="h-5 w-5" />,
  },
  {
    value: 'vm',
    label: 'Virtual Machine',
    description: 'Hypervisor-based VMs (VMware, Hyper-V, KVM)',
    icon: <Monitor className="h-5 w-5" />,
  },
  {
    value: 'appliance',
    label: 'Appliance',
    description: 'Specialized hardware appliances',
    icon: <Box className="h-5 w-5" />,
  },
  {
    value: 'database',
    label: 'Database',
    description: 'Database instances and clusters',
    icon: <Database className="h-5 w-5" />,
  },
  {
    value: 'container',
    label: 'Container',
    description: 'Containerized workloads (Docker, Kubernetes)',
    icon: <Container className="h-5 w-5" />,
  },
  {
    value: 'service',
    label: 'Service',
    description: 'Cloud services and managed platforms',
    icon: <Zap className="h-5 w-5" />,
  },
];

export const ResourceTypeStep: React.FC<ResourceTypeStepProps> = ({
  selectedType,
  onTypeSelect,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Select Resource Type *</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the type of resource you want to create. You can edit the type later if needed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {typeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onTypeSelect(option.value)}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left',
              selectedType === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <div className="mt-0.5 flex-shrink-0 text-muted-foreground">
              {option.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{option.label}</span>
                {selectedType === option.value && (
                  <Badge variant="secondary" className="text-xs">Selected</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
