import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScanAgents, useScanAgentMutations } from '@/hooks/useScanAgents';
import { useDomains } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Bot, Plus, Trash2, Copy, Check, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const ScanAgents: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({ domain_id: '', name: '', site_tag: '' });
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const { data: domains } = useDomains();
  const { data: agents, isLoading, refetch } = useScanAgents(
    selectedDomain === 'all' ? undefined : selectedDomain
  );
  const { createAgent, deleteAgent } = useScanAgentMutations();

  const dateLocale = language === 'ar' ? ar : enUS;

  const handleCreate = async () => {
    if (!newAgent.domain_id || !newAgent.name) {
      toast({ title: t('common.error'), description: t('common.requiredFields'), variant: 'destructive' });
      return;
    }

    const { error, token } = await createAgent({
      domain_id: newAgent.domain_id,
      name: newAgent.name,
      site_tag: newAgent.site_tag || undefined,
    });

    if (error) {
      toast({ title: t('common.error'), variant: 'destructive' });
    } else {
      setGeneratedToken(token);
      refetch();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteAgent(id);
    if (error) {
      toast({ title: t('common.error'), variant: 'destructive' });
    } else {
      toast({ title: t('common.success') });
      refetch();
    }
  };

  const copyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const closeDialog = () => {
    setIsAddOpen(false);
    setNewAgent({ domain_id: '', name: '', site_tag: '' });
    setGeneratedToken(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            {t('agents.title')}
          </h1>
          <p className="text-muted-foreground">{t('agents.subtitle')}</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 me-2" />
          {t('agents.add')}
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="py-4">
          <Select value={selectedDomain} onValueChange={setSelectedDomain}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={t('dashboard.allDomains')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.allDomains')}</SelectItem>
              {domains.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="p-12 text-center">
              <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('agents.noAgents')}</p>
              <Button onClick={() => setIsAddOpen(true)} className="mt-4">
                <Plus className="w-4 h-4 me-2" />
                {t('agents.add')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('agents.name')}</TableHead>
                  <TableHead>{t('dashboard.domain')}</TableHead>
                  <TableHead>{t('agents.siteTag')}</TableHead>
                  <TableHead>{t('agents.status')}</TableHead>
                  <TableHead>{t('agents.lastSeen')}</TableHead>
                  <TableHead>{t('agents.version')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map(agent => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {domains.find(d => d.id === agent.domain_id)?.name || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{agent.site_tag || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={agent.status === 'ONLINE' ? 'default' : 'secondary'}>
                        {agent.status === 'ONLINE' ? (
                          <Wifi className="w-3 h-3 me-1" />
                        ) : (
                          <WifiOff className="w-3 h-3 me-1" />
                        )}
                        {t(`agents.status.${agent.status.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {agent.last_seen_at ? (
                        formatDistanceToNow(new Date(agent.last_seen_at), { addSuffix: true, locale: dateLocale })
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{agent.version || '-'}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(agent.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Agent Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('agents.add')}</DialogTitle>
          </DialogHeader>

          {!generatedToken ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('dashboard.domain')} *</Label>
                <Select value={newAgent.domain_id} onValueChange={(v) => setNewAgent(p => ({ ...p, domain_id: v }))}>
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

              <div className="space-y-2">
                <Label>{t('agents.name')} *</Label>
                <Input
                  value={newAgent.name}
                  onChange={(e) => setNewAgent(p => ({ ...p, name: e.target.value }))}
                  placeholder={t('agents.namePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('agents.siteTag')}</Label>
                <Input
                  value={newAgent.site_tag}
                  onChange={(e) => setNewAgent(p => ({ ...p, site_tag: e.target.value }))}
                  placeholder={t('agents.siteTagPlaceholder')}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>{t('common.cancel')}</Button>
                <Button onClick={handleCreate}>{t('common.save')}</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                  {t('agents.tokenGenerated')}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mb-4">
                  {t('agents.tokenWarning')}
                </p>
                <div className="flex gap-2">
                  <Input
                    value={generatedToken}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button size="icon" variant="outline" onClick={copyToken}>
                    {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={closeDialog}>{t('common.close')}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScanAgents;
