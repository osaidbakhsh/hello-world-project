import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Server,
  KeyRound,
  ListTodo,
  FileText,
  Calendar,
  Shield,
  Wrench,
  Download,
} from 'lucide-react';

interface QuickActionsProps {
  domainId: string;
  domainName: string;
}

const QuickActions: React.FC<QuickActionsProps> = ({ domainId, domainName }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const actions = [
    {
      icon: Server,
      label: t('domainSummary.addServer'),
      action: () => navigate('/resources'),
      color: 'text-blue-500',
    },
    {
      icon: KeyRound,
      label: t('domainSummary.addLicense'),
      action: () => navigate('/licenses'),
      color: 'text-purple-500',
    },
    {
      icon: ListTodo,
      label: t('domainSummary.createTask'),
      action: () => navigate('/tasks'),
      color: 'text-green-500',
    },
    {
      icon: Calendar,
      label: t('domainSummary.scheduleMaintenance'),
      action: () => {}, // Will be enabled in EPIC C
      disabled: true,
      color: 'text-orange-500',
    },
    {
      icon: Shield,
      label: t('domainSummary.createCSR'),
      action: () => navigate('/it-tools'),
      color: 'text-cyan-500',
    },
    {
      icon: FileText,
      label: t('domainSummary.exportReport'),
      action: () => navigate('/reports'),
      color: 'text-pink-500',
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          {t('domainSummary.quickActions')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {t('domainSummary.actionsFor')} {domainName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={index}
              onClick={action.action}
              disabled={action.disabled}
              className="cursor-pointer"
            >
              <Icon className={`w-4 h-4 me-2 ${action.color}`} />
              {action.label}
              {action.disabled && (
                <span className="ms-auto text-xs text-muted-foreground">
                  {t('domainSummary.comingSoon')}
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default QuickActions;
