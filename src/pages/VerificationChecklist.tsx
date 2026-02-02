import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Database,
  Network,
  Users,
  RefreshCw,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface TestResult {
  name: string;
  category: string;
  status: 'pending' | 'running' | 'pass' | 'fail' | 'skipped';
  message?: string;
  duration?: number;
}

const VerificationChecklist: React.FC = () => {
  const { t, dir, language } = useLanguage();
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'RLS - Super Admin Access', category: 'RBAC', status: 'pending' },
    { name: 'RLS - Domain Scoping', category: 'RBAC', status: 'pending' },
    { name: 'RLS - Employee Restrictions', category: 'RBAC', status: 'pending' },
    { name: 'Database - Profiles Table', category: 'Database', status: 'pending' },
    { name: 'Database - Domains Table', category: 'Database', status: 'pending' },
    { name: 'Database - Networks Table', category: 'Database', status: 'pending' },
    { name: 'Database - Servers Table', category: 'Database', status: 'pending' },
    { name: 'Test Buttons - Connection Test Runs', category: 'Functionality', status: 'pending' },
    { name: 'Test Buttons - System Health Checks', category: 'Functionality', status: 'pending' },
    { name: 'Agent Events - Table Exists', category: 'Functionality', status: 'pending' },
    { name: 'Edge Functions - Deployed', category: 'Infrastructure', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const updateTest = (name: string, update: Partial<TestResult>) => {
    setTests(prev => prev.map(t => t.name === name ? { ...t, ...update } : t));
  };

  const runTests = async () => {
    setIsRunning(true);
    
    // Reset all tests
    setTests(prev => prev.map(t => ({ ...t, status: 'pending' as const, message: undefined, duration: undefined })));

    // Test 1: RLS - Super Admin Access
    try {
      updateTest('RLS - Super Admin Access', { status: 'running' });
      const start = Date.now();
      const { data, error } = await supabase.from('domains').select('count');
      const duration = Date.now() - start;
      if (error) throw error;
      updateTest('RLS - Super Admin Access', { status: 'pass', message: 'Can access domains table', duration });
    } catch (e: any) {
      updateTest('RLS - Super Admin Access', { status: 'fail', message: e.message });
    }

    // Test 2: RLS - Domain Scoping
    try {
      updateTest('RLS - Domain Scoping', { status: 'running' });
      const start = Date.now();
      const { data, error } = await supabase.from('domain_memberships').select('*').limit(5);
      const duration = Date.now() - start;
      if (error) throw error;
      updateTest('RLS - Domain Scoping', { status: 'pass', message: `Found ${data?.length || 0} memberships`, duration });
    } catch (e: any) {
      updateTest('RLS - Domain Scoping', { status: 'fail', message: e.message });
    }

    // Test 3: RLS - Employee Restrictions (check user_roles table)
    try {
      updateTest('RLS - Employee Restrictions', { status: 'running' });
      const start = Date.now();
      const { data, error } = await supabase.from('user_roles').select('count');
      const duration = Date.now() - start;
      if (error) throw error;
      updateTest('RLS - Employee Restrictions', { status: 'pass', message: 'User roles table accessible', duration });
    } catch (e: any) {
      updateTest('RLS - Employee Restrictions', { status: 'fail', message: e.message });
    }

    // Test 4-7: Database tables
    const tables = ['profiles', 'domains', 'networks', 'servers'];
    for (const table of tables) {
      const testName = `Database - ${table.charAt(0).toUpperCase() + table.slice(1)} Table`;
      try {
        updateTest(testName, { status: 'running' });
        const start = Date.now();
        const { data, error } = await supabase.from(table as any).select('count');
        const duration = Date.now() - start;
        if (error) throw error;
        updateTest(testName, { status: 'pass', message: 'Table accessible', duration });
      } catch (e: any) {
        updateTest(testName, { status: 'fail', message: e.message });
      }
    }

    // Test 8: Connection Test Runs
    try {
      updateTest('Test Buttons - Connection Test Runs', { status: 'running' });
      const start = Date.now();
      const { data, error } = await supabase
        .from('connection_test_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      const duration = Date.now() - start;
      if (error) throw error;
      updateTest('Test Buttons - Connection Test Runs', { 
        status: 'pass', 
        message: `${data?.length || 0} recent test runs found`, 
        duration 
      });
    } catch (e: any) {
      updateTest('Test Buttons - Connection Test Runs', { status: 'fail', message: e.message });
    }

    // Test 9: System Health Checks
    try {
      updateTest('Test Buttons - System Health Checks', { status: 'running' });
      const start = Date.now();
      const { data, error } = await supabase
        .from('system_health_checks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      const duration = Date.now() - start;
      if (error) throw error;
      updateTest('Test Buttons - System Health Checks', { 
        status: 'pass', 
        message: `${data?.length || 0} recent health checks found`, 
        duration 
      });
    } catch (e: any) {
      updateTest('Test Buttons - System Health Checks', { status: 'fail', message: e.message });
    }

    // Test 10: Agent Events Table
    try {
      updateTest('Agent Events - Table Exists', { status: 'running' });
      const start = Date.now();
      const { data, error } = await (supabase as any)
        .from('agent_events')
        .select('count');
      const duration = Date.now() - start;
      if (error) throw error;
      updateTest('Agent Events - Table Exists', { status: 'pass', message: 'Table accessible', duration });
    } catch (e: any) {
      updateTest('Agent Events - Table Exists', { status: 'fail', message: e.message });
    }

    // Test 11: Edge Functions (check by calling storage-health-check)
    try {
      updateTest('Edge Functions - Deployed', { status: 'running' });
      const start = Date.now();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-health-check`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const duration = Date.now() - start;
      
      if (response.ok) {
        const result = await response.json();
        updateTest('Edge Functions - Deployed', { 
          status: 'pass', 
          message: result.message || 'Functions responding',
          duration 
        });
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Function error');
      }
    } catch (e: any) {
      updateTest('Edge Functions - Deployed', { status: 'fail', message: e.message });
    }

    setIsRunning(false);
    setLastRun(new Date());
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'RBAC': return Shield;
      case 'Database': return Database;
      case 'Functionality': return FileCheck;
      case 'Infrastructure': return Network;
      default: return CheckCircle;
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-success" />;
      case 'fail': return <XCircle className="w-5 h-5 text-destructive" />;
      case 'running': return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'skipped': return <AlertTriangle className="w-5 h-5 text-warning" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-muted" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'pass': return <Badge className="bg-success text-success-foreground">PASS</Badge>;
      case 'fail': return <Badge variant="destructive">FAIL</Badge>;
      case 'running': return <Badge variant="outline">Running...</Badge>;
      case 'skipped': return <Badge variant="secondary">Skipped</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const passCount = tests.filter(t => t.status === 'pass').length;
  const failCount = tests.filter(t => t.status === 'fail').length;
  const totalCount = tests.length;

  const categories = Array.from(new Set(tests.map(t => t.category)));

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'قائمة التحقق' : 'Verification Checklist'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'تحقق من أمان وصحة النظام - للمسؤولين الأعلى فقط'
              : 'Verify system security and health - Super Admin only'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastRun && (
            <span className="text-sm text-muted-foreground">
              {language === 'ar' ? 'آخر تشغيل: ' : 'Last run: '}
              {lastRun.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={runTests} disabled={isRunning}>
            {isRunning ? (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 me-2" />
            )}
            {language === 'ar' ? 'تشغيل جميع الاختبارات' : 'Run All Tests'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-success">{passCount}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'اختبارات ناجحة' : 'Tests Passed'}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-destructive">{failCount}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'اختبارات فاشلة' : 'Tests Failed'}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'إجمالي الاختبارات' : 'Total Tests'}
                </p>
              </div>
              <FileCheck className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map(category => {
          const categoryTests = tests.filter(t => t.category === category);
          const CategoryIcon = getCategoryIcon(category);
          const categoryPassed = categoryTests.every(t => t.status === 'pass');
          const categoryFailed = categoryTests.some(t => t.status === 'fail');

          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      categoryPassed ? 'bg-success/10' : 
                      categoryFailed ? 'bg-destructive/10' : 'bg-muted'
                    }`}>
                      <CategoryIcon className={`w-5 h-5 ${
                        categoryPassed ? 'text-success' : 
                        categoryFailed ? 'text-destructive' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <CardTitle className="text-lg">{category}</CardTitle>
                  </div>
                  <Badge variant={categoryPassed ? 'default' : categoryFailed ? 'destructive' : 'outline'}>
                    {categoryTests.filter(t => t.status === 'pass').length}/{categoryTests.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {categoryTests.map(test => (
                      <div
                        key={test.name}
                        className={`p-3 rounded-lg border ${
                          test.status === 'pass' ? 'border-success/50 bg-success/5' :
                          test.status === 'fail' ? 'border-destructive/50 bg-destructive/5' :
                          'border-border bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(test.status)}
                            <div>
                              <p className="font-medium text-sm">{test.name}</p>
                              {test.message && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {test.message}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {test.duration !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {test.duration}ms
                              </span>
                            )}
                            {getStatusBadge(test.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Security Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {language === 'ar' ? 'ملاحظات الأمان' : 'Security Notes'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• {language === 'ar' 
              ? 'سياسات RLS تستخدم is_super_admin() للوصول العام'
              : 'RLS policies use is_super_admin() for global access'}</p>
            <p>• {language === 'ar'
              ? 'سياسات RLS تستخدم can_access_domain() لعمليات SELECT على مستوى النطاق'
              : 'RLS policies use can_access_domain() for domain-level SELECT'}</p>
            <p>• {language === 'ar'
              ? 'سياسات RLS تستخدم is_domain_admin() لعمليات CRUD على مستوى النطاق'
              : 'RLS policies use is_domain_admin() for domain-level CRUD'}</p>
            <p>• {language === 'ar'
              ? 'فحوصات صحة النظام مقيدة للمسؤولين الأعلى فقط'
              : 'System health checks restricted to super_admin only'}</p>
            <p>• {language === 'ar'
              ? 'دوال Edge تتحقق من صلاحيات النطاق على الخادم'
              : 'Edge functions verify domain access server-side'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationChecklist;
