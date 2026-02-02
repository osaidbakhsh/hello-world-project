import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, 
  Database, 
  HardDrive, 
  Radio, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Clock,
  ChevronDown,
  Shield
} from 'lucide-react';
import type { SystemHealthCheck } from '@/types/supabase-models';

type CheckType = 'auth' | 'db' | 'storage' | 'realtime';
type CheckStatus = 'idle' | 'testing' | 'success' | 'fail';

interface HealthCheckState {
  status: CheckStatus;
  latency_ms: number | null;
  error_message: string | null;
  error_details: any | null;
  last_checked: string | null;
}

const SystemHealth: React.FC = () => {
  const { t, language, dir } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();

  const [checks, setChecks] = useState<Record<CheckType, HealthCheckState>>({
    auth: { status: 'idle', latency_ms: null, error_message: null, error_details: null, last_checked: null },
    db: { status: 'idle', latency_ms: null, error_message: null, error_details: null, last_checked: null },
    storage: { status: 'idle', latency_ms: null, error_message: null, error_details: null, last_checked: null },
    realtime: { status: 'idle', latency_ms: null, error_message: null, error_details: null, last_checked: null },
  });

  const [isRunningAll, setIsRunningAll] = useState(false);
  const [lastResults, setLastResults] = useState<SystemHealthCheck[]>([]);

  // Load last results on mount
  useEffect(() => {
    loadLastResults();
  }, []);

  const loadLastResults = async () => {
    const { data } = await supabase
      .from('system_health_checks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) {
      // Cast with type assertion after validation
      const validResults = data.filter(r => 
        ['auth', 'db', 'storage', 'realtime'].includes(r.check_type) &&
        ['success', 'fail'].includes(r.status)
      ) as SystemHealthCheck[];
      
      setLastResults(validResults);
      
      // Update states from last results
      const latestByType: Record<string, SystemHealthCheck> = {};
      for (const result of validResults) {
        if (!latestByType[result.check_type]) {
          latestByType[result.check_type] = result;
        }
      }
      
      setChecks(prev => {
        const updated = { ...prev };
        for (const [type, result] of Object.entries(latestByType)) {
          if (type in updated) {
            updated[type as CheckType] = {
              status: result.status as CheckStatus,
              latency_ms: result.latency_ms,
              error_message: result.error_message,
              error_details: result.error_details,
              last_checked: result.created_at,
            };
          }
        }
        return updated;
      });
    }
  };

  const saveResult = async (checkType: CheckType, status: 'success' | 'fail', latencyMs: number, errorMessage?: string, errorDetails?: any) => {
    await supabase.from('system_health_checks').insert([{
      check_type: checkType,
      status,
      latency_ms: latencyMs,
      error_message: errorMessage || null,
      error_details: errorDetails || null,
      checked_by: profile?.id,
    }]);
    loadLastResults();
  };

  const runAuthCheck = async () => {
    setChecks(prev => ({ ...prev, auth: { ...prev.auth, status: 'testing' } }));
    const startTime = Date.now();
    
    try {
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      if (!session.session) {
        throw new Error('No active session');
      }

      // Try to refresh the token
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;

      const latencyMs = Date.now() - startTime;
      setChecks(prev => ({
        ...prev,
        auth: { status: 'success', latency_ms: latencyMs, error_message: null, error_details: null, last_checked: new Date().toISOString() },
      }));
      await saveResult('auth', 'success', latencyMs);
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      setChecks(prev => ({
        ...prev,
        auth: { status: 'fail', latency_ms: latencyMs, error_message: error.message, error_details: error, last_checked: new Date().toISOString() },
      }));
      await saveResult('auth', 'fail', latencyMs, error.message, error);
    }
  };

  const runDbCheck = async () => {
    setChecks(prev => ({ ...prev, db: { ...prev.db, status: 'testing' } }));
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw error;

      const latencyMs = Date.now() - startTime;
      setChecks(prev => ({
        ...prev,
        db: { status: 'success', latency_ms: latencyMs, error_message: null, error_details: null, last_checked: new Date().toISOString() },
      }));
      await saveResult('db', 'success', latencyMs);
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      setChecks(prev => ({
        ...prev,
        db: { status: 'fail', latency_ms: latencyMs, error_message: error.message, error_details: error, last_checked: new Date().toISOString() },
      }));
      await saveResult('db', 'fail', latencyMs, error.message, error);
    }
  };

  const runStorageCheck = async () => {
    setChecks(prev => ({ ...prev, storage: { ...prev.storage, status: 'testing' } }));
    const startTime = Date.now();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-health-check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      const result = await response.json();
      const latencyMs = Date.now() - startTime;

      if (result.success) {
        setChecks(prev => ({
          ...prev,
          storage: { status: 'success', latency_ms: result.latency_ms || latencyMs, error_message: null, error_details: { buckets: result.buckets }, last_checked: new Date().toISOString() },
        }));
        await saveResult('storage', 'success', result.latency_ms || latencyMs, undefined, { buckets: result.buckets });
      } else {
        throw new Error(result.message || result.error || 'Storage check failed');
      }
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      setChecks(prev => ({
        ...prev,
        storage: { status: 'fail', latency_ms: latencyMs, error_message: error.message, error_details: error, last_checked: new Date().toISOString() },
      }));
      await saveResult('storage', 'fail', latencyMs, error.message, error);
    }
  };

  const runRealtimeCheck = async () => {
    setChecks(prev => ({ ...prev, realtime: { ...prev.realtime, status: 'testing' } }));
    const startTime = Date.now();
    
    try {
      const channel = supabase.channel('health-check-' + Date.now());
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          channel.unsubscribe();
          reject(new Error('Realtime connection timeout (3s)'));
        }, 3000);

        channel
          .on('system', { event: '*' }, () => {})
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout);
              channel.unsubscribe();
              resolve();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              clearTimeout(timeout);
              channel.unsubscribe();
              reject(new Error(`Realtime status: ${status}`));
            }
          });
      });

      const latencyMs = Date.now() - startTime;
      setChecks(prev => ({
        ...prev,
        realtime: { status: 'success', latency_ms: latencyMs, error_message: null, error_details: null, last_checked: new Date().toISOString() },
      }));
      await saveResult('realtime', 'success', latencyMs);
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      setChecks(prev => ({
        ...prev,
        realtime: { status: 'fail', latency_ms: latencyMs, error_message: error.message, error_details: error, last_checked: new Date().toISOString() },
      }));
      await saveResult('realtime', 'fail', latencyMs, error.message, error);
    }
  };

  const runAllChecks = async () => {
    setIsRunningAll(true);
    await Promise.all([
      runAuthCheck(),
      runDbCheck(),
      runStorageCheck(),
      runRealtimeCheck(),
    ]);
    setIsRunningAll(false);
    toast({
      title: language === 'ar' ? 'اكتمل الفحص' : 'Health Check Complete',
      description: language === 'ar' ? 'تم فحص جميع الخدمات' : 'All services have been checked',
    });
  };

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'testing':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case 'testing':
        return <Badge variant="secondary">{language === 'ar' ? 'جاري الفحص' : 'Testing'}</Badge>;
      case 'success':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{language === 'ar' ? 'نجح' : 'OK'}</Badge>;
      case 'fail':
        return <Badge variant="destructive">{language === 'ar' ? 'فشل' : 'Failed'}</Badge>;
      default:
        return <Badge variant="outline">{language === 'ar' ? 'لم يفحص' : 'Not tested'}</Badge>;
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return language === 'ar' ? 'لم يفحص بعد' : 'Not tested yet';
    const date = new Date(isoString);
    return date.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US');
  };

  const checkConfigs: { type: CheckType; icon: React.ReactNode; title: string; description: string; runCheck: () => Promise<void> }[] = [
    {
      type: 'auth',
      icon: <Shield className="w-6 h-6" />,
      title: language === 'ar' ? 'المصادقة' : 'Authentication',
      description: language === 'ar' ? 'فحص جلسة المستخدم وتجديد الرمز' : 'Check user session and token refresh',
      runCheck: runAuthCheck,
    },
    {
      type: 'db',
      icon: <Database className="w-6 h-6" />,
      title: language === 'ar' ? 'قاعدة البيانات' : 'Database',
      description: language === 'ar' ? 'فحص اتصال PostgreSQL' : 'Check PostgreSQL connection',
      runCheck: runDbCheck,
    },
    {
      type: 'storage',
      icon: <HardDrive className="w-6 h-6" />,
      title: language === 'ar' ? 'التخزين' : 'Storage',
      description: language === 'ar' ? 'فحص الوصول إلى دلاء التخزين' : 'Check storage bucket access',
      runCheck: runStorageCheck,
    },
    {
      type: 'realtime',
      icon: <Radio className="w-6 h-6" />,
      title: language === 'ar' ? 'الوقت الفعلي' : 'Realtime',
      description: language === 'ar' ? 'فحص اتصال WebSocket' : 'Check WebSocket connection',
      runCheck: runRealtimeCheck,
    },
  ];

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {language === 'ar' ? 'غير مصرح' : 'Access Denied'}
            </h2>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'هذه الصفحة متاحة للمسؤولين فقط' : 'This page is only available to administrators'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {language === 'ar' ? 'صحة النظام' : 'System Health'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'فحص حالة خدمات النظام' : 'Check system services status'}
            </p>
          </div>
        </div>

        <Button onClick={runAllChecks} disabled={isRunningAll}>
          {isRunningAll ? (
            <Loader2 className="w-4 h-4 me-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 me-2" />
          )}
          {language === 'ar' ? 'فحص الكل' : 'Run All Tests'}
        </Button>
      </div>

      {/* Health Check Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checkConfigs.map(({ type, icon, title, description, runCheck }) => {
          const check = checks[type];
          return (
            <Card key={type} className={check.status === 'fail' ? 'border-destructive/50' : check.status === 'success' ? 'border-green-500/50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${check.status === 'success' ? 'bg-green-500/10 text-green-600' : check.status === 'fail' ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
                      {icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{title}</CardTitle>
                      <CardDescription>{description}</CardDescription>
                    </div>
                  </div>
                  {getStatusIcon(check.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  {getStatusBadge(check.status)}
                  {check.latency_ms !== null && (
                    <span className="text-sm text-muted-foreground">
                      {check.latency_ms}ms
                    </span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground mb-3">
                  {language === 'ar' ? 'آخر فحص: ' : 'Last checked: '}
                  {formatTime(check.last_checked)}
                </div>

                {check.status === 'fail' && check.error_message && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1 text-sm text-destructive hover:underline">
                      <ChevronDown className="w-4 h-4" />
                      {language === 'ar' ? 'عرض الخطأ' : 'Show error'}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 p-2 bg-destructive/5 rounded-md text-sm text-destructive">
                      {check.error_message}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {check.status === 'success' && check.error_details?.buckets && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1 text-sm text-green-600 hover:underline">
                      <ChevronDown className="w-4 h-4" />
                      {language === 'ar' ? 'عرض التفاصيل' : 'Show details'}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 p-2 bg-green-500/5 rounded-md text-sm">
                      <p className="font-medium mb-1">{language === 'ar' ? 'الدلاء:' : 'Buckets:'}</p>
                      <ul className="list-disc list-inside">
                        {check.error_details.buckets.map((b: any) => (
                          <li key={b.id}>{b.name} {b.public ? '(public)' : '(private)'}</li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={runCheck}
                  disabled={check.status === 'testing'}
                >
                  {check.status === 'testing' ? (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 me-2" />
                  )}
                  {language === 'ar' ? 'فحص' : 'Test'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'آخر النتائج' : 'Recent Results'}</CardTitle>
        </CardHeader>
        <CardContent>
          {lastResults.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {language === 'ar' ? 'لا توجد نتائج بعد' : 'No results yet'}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {lastResults.slice(0, 10).map((result) => (
                <div key={result.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    {result.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span className="font-medium capitalize">{result.check_type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{result.latency_ms}ms</span>
                    <span>{formatTime(result.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemHealth;
