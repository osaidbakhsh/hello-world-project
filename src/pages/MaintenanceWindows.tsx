import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSite } from '@/contexts/SiteContext';
import { useSiteDomains } from '@/hooks/useSiteDomains';
import { useDomains, useServers, useProfiles, useVacations } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Wrench,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Server,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Trash2,
  Edit,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { format, isWithinInterval, addDays, parseISO, isBefore, isAfter } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface MaintenanceWindow {
  id: string;
  domain_id: string | null;
  site_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  recurrence: string;
  affected_servers: string[] | null;
  status: string;
  impact_level: string;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  assigned_to: string | null;
  completion_notes: string | null;
  created_at: string;
}

interface ChangeRequest {
  id: string;
  maintenance_window_id: string | null;
  title: string;
  description: string | null;
  requested_by: string | null;
  status: string;
  risk_assessment: string | null;
  priority: string;
  rollback_plan: string | null;
  created_at: string;
}

interface Conflict {
  type: 'maintenance' | 'vacation' | 'license';
  message: string;
  severity: 'warning' | 'error';
}

const MaintenanceWindows: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const { selectedSite } = useSite();
  const { data: siteDomainIds = [] } = useSiteDomains();
  const { profile } = useAuth();
  const { data: domains } = useDomains();
  const { data: servers } = useServers();
  const { data: profiles } = useProfiles();
  const { data: vacations } = useVacations();
  const queryClient = useQueryClient();

  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('calendar');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  // Form state
  const [newWindow, setNewWindow] = useState({
    title: '',
    description: '',
    domain_id: '',
    start_time: '',
    end_time: '',
    recurrence: 'once',
    affected_servers: [] as string[],
    impact_level: 'medium',
    notes: '',
    assigned_to: '',
    completion_notes: '',
  });

  // Editing state
  const [editingWindow, setEditingWindow] = useState<MaintenanceWindow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Pre-select first domain when dialog opens
  useEffect(() => {
    if (isAddDialogOpen && domains.length > 0 && !newWindow.domain_id) {
      setNewWindow(prev => ({ ...prev, domain_id: domains[0].id }));
    }
  }, [isAddDialogOpen, domains, newWindow.domain_id]);

  // Fetch maintenance windows
  const { data: maintenanceWindows = [], isLoading } = useQuery({
    queryKey: ['maintenance_windows', selectedSite?.id],
    queryFn: async () => {
      if (!selectedSite || siteDomainIds.length === 0) {
        return [];
      }
      const { data, error } = await supabase
        .from('maintenance_windows')
        .select('*')
        .in('domain_id', siteDomainIds)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data as MaintenanceWindow[];
    },
    enabled: !!selectedSite && siteDomainIds.length > 0,
  });

  // Fetch change requests
  const { data: changeRequests = [] } = useQuery({
    queryKey: ['change_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ChangeRequest[];
    },
  });

  // Create maintenance window mutation
  const createMutation = useMutation({
    mutationFn: async (window: typeof newWindow) => {
      const { data, error } = await supabase
        .from('maintenance_windows')
        .insert({
          title: window.title,
          description: window.description || null,
          domain_id: window.domain_id || null,
          site_id: selectedSite?.id || null,
          start_time: window.start_time,
          end_time: window.end_time,
          recurrence: window.recurrence,
          affected_servers: window.affected_servers.length > 0 ? window.affected_servers : null,
          impact_level: window.impact_level,
          notes: window.notes || null,
          assigned_to: window.assigned_to || null,
          created_by: profile?.id,
          status: 'scheduled',
        })
        .select()
        .single();
      if (error) throw error;
      
      // Create 'created' event
      await supabase.from('maintenance_events').insert({
        maintenance_id: data.id,
        event_type: 'created',
        actor_id: profile?.id,
        notes: `Created maintenance window: ${window.title}`,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_windows'] });
      toast.success(t('maintenance.created'));
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(t('common.error'));
      console.error(error);
    },
  });

  // Update maintenance window mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MaintenanceWindow> }) => {
      const { data: updated, error } = await supabase
        .from('maintenance_windows')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      // Create 'updated' event
      await supabase.from('maintenance_events').insert({
        maintenance_id: id,
        event_type: 'updated',
        actor_id: profile?.id,
        notes: `Updated maintenance window`,
        metadata: data,
      });
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_windows'] });
      toast.success(t('common.updated'));
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(t('common.error'));
      console.error(error);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenance_windows')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_windows'] });
      toast.success(t('common.deleted'));
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('maintenance_windows')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_windows'] });
      toast.success(t('common.updated'));
    },
  });

  const resetForm = () => {
    setNewWindow({
      title: '',
      description: '',
      domain_id: '',
      start_time: '',
      end_time: '',
      recurrence: 'once',
      affected_servers: [],
      impact_level: 'medium',
      notes: '',
      assigned_to: '',
      completion_notes: '',
    });
    setConflicts([]);
    setEditingWindow(null);
  };

  // Detect conflicts
  const detectConflicts = (startTime: string, endTime: string, affectedServers: string[]) => {
    const newConflicts: Conflict[] = [];
    const start = parseISO(startTime);
    const end = parseISO(endTime);

    // Check for overlapping maintenance windows
    maintenanceWindows.forEach(window => {
      if (window.status === 'cancelled') return;
      const windowStart = parseISO(window.start_time);
      const windowEnd = parseISO(window.end_time);
      
      // Check if times overlap
      if (
        (isBefore(start, windowEnd) && isAfter(end, windowStart)) &&
        affectedServers.some(s => window.affected_servers?.includes(s))
      ) {
        newConflicts.push({
          type: 'maintenance',
          message: `${t('maintenance.conflictWith')} "${window.title}" (${format(windowStart, 'PP')})`,
          severity: 'error',
        });
      }
    });

    // Check for vacations of responsible users
    if (vacations) {
      affectedServers.forEach(serverId => {
        const server = servers?.find(s => s.id === serverId);
        if (server?.responsible_user) {
          vacations.forEach(vacation => {
            const vacationStart = parseISO(vacation.start_date);
            const vacationEnd = parseISO(vacation.end_date);
            if (
              vacation.status === 'approved' &&
              isBefore(start, vacationEnd) && 
              isAfter(end, vacationStart)
            ) {
              const profile = profiles?.find(p => p.id === vacation.profile_id);
              newConflicts.push({
                type: 'vacation',
                message: `${t('maintenance.responsibleOnVacation')}: ${profile?.full_name || server.responsible_user}`,
                severity: 'warning',
              });
            }
          });
        }
      });
    }

    setConflicts(newConflicts);
  };

  // Filter by domain
  const filteredWindows = useMemo(() => {
    if (selectedDomainId === 'all') return maintenanceWindows;
    return maintenanceWindows.filter(w => w.domain_id === selectedDomainId);
  }, [maintenanceWindows, selectedDomainId]);

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline"><Clock className="w-3 h-3 me-1" />{t('maintenance.scheduled')}</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500"><Play className="w-3 h-3 me-1" />{t('maintenance.inProgress')}</Badge>;
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 me-1" />{t('maintenance.completed')}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 me-1" />{t('maintenance.cancelled')}</Badge>;
      case 'postponed':
        return <Badge variant="secondary"><Pause className="w-3 h-3 me-1" />{t('maintenance.postponed')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get impact badge
  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'critical':
        return <Badge variant="destructive">{t('maintenance.critical')}</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">{t('maintenance.high')}</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">{t('maintenance.medium')}</Badge>;
      case 'low':
        return <Badge variant="secondary">{t('maintenance.low')}</Badge>;
      default:
        return <Badge>{impact}</Badge>;
    }
  };

  const handleServerToggle = (serverId: string) => {
    setNewWindow(prev => {
      const servers = prev.affected_servers.includes(serverId)
        ? prev.affected_servers.filter(id => id !== serverId)
        : [...prev.affected_servers, serverId];
      
      // Detect conflicts when servers change
      if (prev.start_time && prev.end_time) {
        detectConflicts(prev.start_time, prev.end_time, servers);
      }
      
      return { ...prev, affected_servers: servers };
    });
  };

  const handleTimeChange = (field: 'start_time' | 'end_time', value: string) => {
    setNewWindow(prev => {
      const updated = { ...prev, [field]: value };
      
      // Detect conflicts when time changes
      if (updated.start_time && updated.end_time && updated.affected_servers.length > 0) {
        detectConflicts(updated.start_time, updated.end_time, updated.affected_servers);
      }
      
      return updated;
    });
  };

  const dateLocale = language === 'ar' ? ar : enUS;

  // Get windows for selected date
  const windowsForDate = useMemo(() => {
    return filteredWindows.filter(window => {
      const start = parseISO(window.start_time);
      const end = parseISO(window.end_time);
      return isWithinInterval(selectedDate, { start, end }) ||
        format(start, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') ||
        format(end, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
    });
  }, [filteredWindows, selectedDate]);

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('maintenance.title')}</h1>
          <p className="text-muted-foreground">{t('maintenance.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('domainSummary.selectDomain')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.allDomains')}</SelectItem>
              {domains?.map(domain => (
                <SelectItem key={domain.id} value={domain.id}>
                  {domain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 me-2" />
                {t('maintenance.add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir}>
              <DialogHeader>
                <DialogTitle>{t('maintenance.add')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Conflict Alerts */}
                {conflicts.length > 0 && (
                  <Alert variant={conflicts.some(c => c.severity === 'error') ? 'destructive' : 'default'}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('maintenance.conflictsDetected')}</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2">
                        {conflicts.map((conflict, index) => (
                          <li key={index} className={conflict.severity === 'error' ? 'text-destructive' : 'text-warning'}>
                            {conflict.message}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>{t('maintenance.windowTitle')}</Label>
                    <Input
                      value={newWindow.title}
                      onChange={(e) => setNewWindow(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={t('maintenance.titlePlaceholder')}
                    />
                  </div>

                  <div>
                    <Label>{t('nav.domains')}</Label>
                    <Select
                      value={newWindow.domain_id}
                      onValueChange={(value) => setNewWindow(prev => ({ ...prev, domain_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('domainSummary.selectDomain')} />
                      </SelectTrigger>
                      <SelectContent>
                        {domains?.map(domain => (
                          <SelectItem key={domain.id} value={domain.id}>
                            {domain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('maintenance.impactLevel')}</Label>
                    <Select
                      value={newWindow.impact_level}
                      onValueChange={(value) => setNewWindow(prev => ({ ...prev, impact_level: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('maintenance.low')}</SelectItem>
                        <SelectItem value="medium">{t('maintenance.medium')}</SelectItem>
                        <SelectItem value="high">{t('maintenance.high')}</SelectItem>
                        <SelectItem value="critical">{t('maintenance.critical')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('maintenance.startTime')}</Label>
                    <Input
                      type="datetime-local"
                      value={newWindow.start_time}
                      onChange={(e) => handleTimeChange('start_time', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>{t('maintenance.endTime')}</Label>
                    <Input
                      type="datetime-local"
                      value={newWindow.end_time}
                      onChange={(e) => handleTimeChange('end_time', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>{t('maintenance.recurrence')}</Label>
                    <Select
                      value={newWindow.recurrence}
                      onValueChange={(value) => setNewWindow(prev => ({ ...prev, recurrence: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">{t('maintenance.once')}</SelectItem>
                        <SelectItem value="daily">{t('maintenance.daily')}</SelectItem>
                        <SelectItem value="weekly">{t('maintenance.weekly')}</SelectItem>
                        <SelectItem value="monthly">{t('maintenance.monthly')}</SelectItem>
                        <SelectItem value="quarterly">{t('maintenance.quarterly')}</SelectItem>
                        <SelectItem value="yearly">{t('maintenance.yearly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>{t('maintenance.description')}</Label>
                    <Textarea
                      value={newWindow.description}
                      onChange={(e) => setNewWindow(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={t('maintenance.descriptionPlaceholder')}
                      rows={3}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>{t('maintenance.affectedServers')}</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {servers?.map(server => (
                        <div key={server.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={server.id}
                            checked={newWindow.affected_servers.includes(server.id)}
                            onCheckedChange={() => handleServerToggle(server.id)}
                          />
                          <label htmlFor={server.id} className="text-sm cursor-pointer">
                            {server.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Label>{t('maintenance.assignedTo')}</Label>
                    <Select
                      value={newWindow.assigned_to}
                      onValueChange={(value) => setNewWindow(prev => ({ ...prev, assigned_to: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('maintenance.selectAssignee')} />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles?.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>{t('maintenance.notes')}</Label>
                    <Textarea
                      value={newWindow.notes}
                      onChange={(e) => setNewWindow(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder={t('maintenance.notesPlaceholder')}
                      rows={2}
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate(newWindow)}
                  disabled={!newWindow.title || !newWindow.start_time || !newWindow.end_time || conflicts.some(c => c.severity === 'error')}
                >
                  {t('common.save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
<Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className={dir === 'rtl' ? 'flex justify-end' : 'flex justify-start'}>
          <TabsList>
            <TabsTrigger value="calendar">
              <CalendarIcon className="w-4 h-4 me-2" />
              {t('maintenance.calendar')}
            </TabsTrigger>
            <TabsTrigger value="list">
              <FileText className="w-4 h-4 me-2" />
              {t('maintenance.list')}
            </TabsTrigger>
            <TabsTrigger value="changes">
              <Wrench className="w-4 h-4 me-2" />
              {t('maintenance.changeRequests')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>{t('maintenance.selectDate')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={dateLocale}
                  className="rounded-md border"
                  modifiers={{
                    hasWindow: filteredWindows.map(w => parseISO(w.start_time)),
                  }}
                  modifiersStyles={{
                    hasWindow: { backgroundColor: 'hsl(var(--primary) / 0.2)' },
                  }}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {t('maintenance.windowsFor')} {format(selectedDate, 'PPP', { locale: dateLocale })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {windowsForDate.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <CalendarIcon className="w-12 h-12 mb-2 opacity-30" />
                    <p>{t('maintenance.noWindowsForDate')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {windowsForDate.map(window => (
                      <div key={window.id} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{window.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(parseISO(window.start_time), 'PPp', { locale: dateLocale })} - 
                              {format(parseISO(window.end_time), 'PPp', { locale: dateLocale })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {getStatusBadge(window.status)}
                            {getImpactBadge(window.impact_level)}
                          </div>
                        </div>
                        {window.description && (
                          <p className="text-sm mt-2">{window.description}</p>
                        )}
                        {window.affected_servers && window.affected_servers.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <Server className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {window.affected_servers.length} {t('maintenance.serversAffected')}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-24" />
                </Card>
              ))}
            </div>
          ) : filteredWindows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wrench className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">{t('maintenance.noWindows')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredWindows.map(window => (
                <Card key={window.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{window.title}</h3>
                          {getStatusBadge(window.status)}
                          {getImpactBadge(window.impact_level)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          <Clock className="w-3 h-3 inline me-1" />
                          {format(parseISO(window.start_time), 'PPp', { locale: dateLocale })} - 
                          {format(parseISO(window.end_time), 'PPp', { locale: dateLocale })}
                        </p>
                        {window.description && (
                          <p className="text-sm mt-2">{window.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {window.status === 'scheduled' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateStatusMutation.mutate({ id: window.id, status: 'in_progress' })}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {window.status === 'in_progress' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateStatusMutation.mutate({ id: window.id, status: 'completed' })}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(window.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Change Requests Tab */}
        <TabsContent value="changes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('maintenance.changeRequests')}</CardTitle>
            </CardHeader>
            <CardContent>
              {changeRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mb-2 opacity-30" />
                  <p>{t('maintenance.noChangeRequests')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {changeRequests.map(request => (
                    <div key={request.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{request.title}</h4>
                          <p className="text-sm text-muted-foreground">{request.description}</p>
                        </div>
                        <Badge variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MaintenanceWindows;
