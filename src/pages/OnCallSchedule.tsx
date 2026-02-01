import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDomains, useProfiles } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import {
  Phone,
  Plus,
  User,
  Clock,
  AlertTriangle,
  Settings,
  Calendar as CalendarIcon,
  Users,
  ArrowUp,
  Trash2,
  Edit,
} from 'lucide-react';
import { format, addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface OnCallSchedule {
  id: string;
  name: string;
  domain_id: string | null;
  rotation_type: string;
  start_date: string;
  is_active: boolean;
  created_at: string;
  team_members: string[] | null;
  current_index: number;
}

interface OnCallAssignment {
  id: string;
  schedule_id: string;
  profile_id: string;
  start_time: string;
  end_time: string;
  role: string;
  order_index: number;
}

interface EscalationRule {
  id: string;
  schedule_id: string;
  level: number;
  wait_minutes: number;
  notify_profile_id: string;
  notify_method: string;
}

const OnCallSchedule: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const { data: domains } = useDomains();
  const { data: profiles } = useProfiles();
  const queryClient = useQueryClient();
  
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('schedules');

  // Form state for new schedule
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    domain_id: '',
    rotation_type: 'weekly',
    team_members: [] as string[],
  });

  // Fetch schedules
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['on_call_schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('on_call_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OnCallSchedule[];
    },
  });

  // Fetch assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['on_call_assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('on_call_assignments')
        .select('*')
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data as OnCallAssignment[];
    },
  });

  // Fetch escalation rules
  const { data: escalationRules = [] } = useQuery({
    queryKey: ['escalation_rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escalation_rules')
        .select('*')
        .order('level', { ascending: true });
      if (error) throw error;
      return data as EscalationRule[];
    },
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (schedule: typeof newSchedule) => {
      const { data, error } = await supabase
        .from('on_call_schedules')
        .insert({
          name: schedule.name,
          domain_id: schedule.domain_id || null,
          rotation_type: schedule.rotation_type,
          team_members: schedule.team_members,
          start_date: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['on_call_schedules'] });
      toast.success(t('onCall.scheduleCreated'));
      setIsAddDialogOpen(false);
      setNewSchedule({ name: '', domain_id: '', rotation_type: 'weekly', team_members: [] });
    },
    onError: (error) => {
      toast.error(t('common.error'));
      console.error(error);
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('on_call_schedules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['on_call_schedules'] });
      toast.success(t('common.deleted'));
    },
  });

  // Filter schedules by domain
  const filteredSchedules = useMemo(() => {
    if (selectedDomainId === 'all') return schedules;
    return schedules.filter(s => s.domain_id === selectedDomainId);
  }, [schedules, selectedDomainId]);

  // Get current on-call person
  const getCurrentOnCall = (schedule: OnCallSchedule) => {
    if (!schedule.team_members?.length) return null;
    const index = schedule.current_index || 0;
    const profileId = schedule.team_members[index % schedule.team_members.length];
    return profiles?.find(p => p.id === profileId);
  };

  // Get profile by ID
  const getProfile = (profileId: string) => {
    return profiles?.find(p => p.id === profileId);
  };

  // Get domain by ID
  const getDomain = (domainId: string | null) => {
    if (!domainId) return null;
    return domains?.find(d => d.id === domainId);
  };

  const handleAddTeamMember = (profileId: string) => {
    if (!newSchedule.team_members.includes(profileId)) {
      setNewSchedule(prev => ({
        ...prev,
        team_members: [...prev.team_members, profileId],
      }));
    }
  };

  const handleRemoveTeamMember = (profileId: string) => {
    setNewSchedule(prev => ({
      ...prev,
      team_members: prev.team_members.filter(id => id !== profileId),
    }));
  };

  const dateLocale = language === 'ar' ? ar : enUS;

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('onCall.title')}</h1>
          <p className="text-muted-foreground">{t('onCall.subtitle')}</p>
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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 me-2" />
                {t('onCall.addSchedule')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('onCall.addSchedule')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('common.name')}</Label>
                  <Input
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('onCall.scheduleNamePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('nav.domains')}</Label>
                  <Select 
                    value={newSchedule.domain_id} 
                    onValueChange={(value) => setNewSchedule(prev => ({ ...prev, domain_id: value }))}
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
                  <Label>{t('onCall.rotationType')}</Label>
                  <Select 
                    value={newSchedule.rotation_type} 
                    onValueChange={(value) => setNewSchedule(prev => ({ ...prev, rotation_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t('onCall.daily')}</SelectItem>
                      <SelectItem value="weekly">{t('onCall.weekly')}</SelectItem>
                      <SelectItem value="biweekly">{t('onCall.biweekly')}</SelectItem>
                      <SelectItem value="monthly">{t('onCall.monthly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('onCall.teamMembers')}</Label>
                  <Select onValueChange={handleAddTeamMember}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('onCall.selectMember')} />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles?.filter(p => !newSchedule.team_members.includes(p.id)).map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newSchedule.team_members.map((memberId, index) => {
                      const profile = getProfile(memberId);
                      return (
                        <Badge key={memberId} variant="secondary" className="gap-1">
                          <span className="text-xs text-muted-foreground">#{index + 1}</span>
                          {profile?.full_name}
                          <button
                            onClick={() => handleRemoveTeamMember(memberId)}
                            className="ms-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => createScheduleMutation.mutate(newSchedule)}
                  disabled={!newSchedule.name || newSchedule.team_members.length === 0}
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
        <TabsList>
          <TabsTrigger value="schedules">
            <CalendarIcon className="w-4 h-4 me-2" />
            {t('onCall.schedules')}
          </TabsTrigger>
          <TabsTrigger value="current">
            <Phone className="w-4 h-4 me-2" />
            {t('onCall.currentOnCall')}
          </TabsTrigger>
          <TabsTrigger value="escalation">
            <ArrowUp className="w-4 h-4 me-2" />
            {t('onCall.escalation')}
          </TabsTrigger>
        </TabsList>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-48" />
                </Card>
              ))}
            </div>
          ) : filteredSchedules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Phone className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">{t('onCall.noSchedules')}</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 me-2" />
                  {t('onCall.addSchedule')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchedules.map(schedule => {
                const currentOnCall = getCurrentOnCall(schedule);
                const domain = getDomain(schedule.domain_id);
                return (
                  <Card key={schedule.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{schedule.name}</CardTitle>
                          {domain && (
                            <Badge variant="outline" className="mt-1">
                              {domain.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          {schedule.rotation_type === 'daily' && t('onCall.daily')}
                          {schedule.rotation_type === 'weekly' && t('onCall.weekly')}
                          {schedule.rotation_type === 'biweekly' && t('onCall.biweekly')}
                          {schedule.rotation_type === 'monthly' && t('onCall.monthly')}
                        </span>
                      </div>
                      
                      {currentOnCall ? (
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{currentOnCall.full_name}</p>
                              <p className="text-xs text-muted-foreground">{currentOnCall.phone || t('common.noPhone')}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-muted">
                          <p className="text-sm text-muted-foreground">{t('onCall.noCurrentOnCall')}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {schedule.team_members?.length || 0} {t('onCall.members')}
                        </span>
                      </div>

                      <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                        {schedule.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Current On-Call Tab */}
        <TabsContent value="current" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  {t('onCall.currentOnCallList')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredSchedules.filter(s => s.is_active).map(schedule => {
                  const currentOnCall = getCurrentOnCall(schedule);
                  return (
                    <div key={schedule.id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{schedule.name}</span>
                        <Badge variant="outline">
                          {schedule.rotation_type}
                        </Badge>
                      </div>
                      {currentOnCall ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{currentOnCall.full_name}</p>
                            <p className="text-sm text-muted-foreground">{currentOnCall.email}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">{t('onCall.noCurrentOnCall')}</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('onCall.calendar')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={dateLocale}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Escalation Tab */}
        <TabsContent value="escalation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUp className="w-5 h-5 text-warning" />
                {t('onCall.escalationRules')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSchedules.map(schedule => {
                  const rules = escalationRules.filter(r => r.schedule_id === schedule.id);
                  return (
                    <div key={schedule.id} className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-3">{schedule.name}</h4>
                      {rules.length === 0 ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertTriangle className="w-4 h-4" />
                          <span>{t('onCall.noEscalationRules')}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {rules.map(rule => {
                            const profile = getProfile(rule.notify_profile_id);
                            return (
                              <div key={rule.id} className="flex items-center gap-4 p-2 bg-muted rounded">
                                <Badge variant="outline">
                                  {t('onCall.level')} {rule.level}
                                </Badge>
                                <span className="text-sm">
                                  {t('onCall.waitFor')} {rule.wait_minutes} {t('common.minutes')}
                                </span>
                                <span className="text-sm">→</span>
                                <span className="text-sm font-medium">
                                  {profile?.full_name || t('common.unknown')}
                                </span>
                                <Badge variant="secondary">{rule.notify_method}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OnCallSchedule;
