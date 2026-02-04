import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield,
  KeyRound,
  Eye,
  Lock,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
} from 'lucide-react';

interface SecurityStats {
  totalInfraSecrets: number;
  totalPrivateItems: number;
  recentAccessLogs: Array<{
    id: string;
    accessed_at: string | null;
    access_type: string;
    accessed_by: string;
    profile_name?: string;
    resource_type?: string;
  }>;
}

const SecurityDashboardWidget: React.FC = () => {
  const { dir } = useLanguage();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['security-dashboard-stats'],
    queryFn: async (): Promise<SecurityStats> => {
      // Get infrastructure credentials count
      const { count: infraCount } = await supabase
        .from('infrastructure_credentials')
        .select('*', { count: 'exact', head: true });

      // Get private vault items count for current user
      const { data: { user } } = await supabase.auth.getUser();
      let privateCount = 0;
      if (user) {
        const { count } = await supabase
          .from('user_private_vault')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id);
        privateCount = count || 0;
      }

      // Get recent access logs (last 10)
      const { data: accessLogs } = await supabase
        .from('infra_credential_access_logs')
        .select(`
          id,
          accessed_at,
          access_type,
          accessed_by,
          resource_type
        `)
        .order('accessed_at', { ascending: false })
        .limit(10);

      // Get profile names for the logs
      const profileIds = [...new Set(accessLogs?.map(log => log.accessed_by) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', profileIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const logsWithNames = (accessLogs || []).map(log => ({
        ...log,
        profile_name: profileMap.get(log.accessed_by) || 'Unknown',
      }));

      return {
        totalInfraSecrets: infraCount || 0,
        totalPrivateItems: privateCount,
        recentAccessLogs: logsWithNames,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getAccessTypeIcon = (type: string) => {
    switch (type) {
      case 'reveal':
        return <Eye className="w-3 h-3 text-warning" />;
      case 'create':
        return <CheckCircle className="w-3 h-3 text-success" />;
      case 'delete':
        return <AlertTriangle className="w-3 h-3 text-destructive" />;
      default:
        return <KeyRound className="w-3 h-3 text-primary" />;
    }
  };

  const getAccessTypeLabel = (type: string) => {
    switch (type) {
      case 'reveal':
        return 'كشف السر';
      case 'create':
        return 'إنشاء';
      case 'delete':
        return 'حذف';
      case 'update':
        return 'تحديث';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted/50 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20" dir={dir}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          نظرة عامة على الأمان
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats?.totalInfraSecrets || 0}</p>
                <p className="text-xs text-muted-foreground">أسرار البنية التحتية</p>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{stats?.totalPrivateItems || 0}</p>
                <p className="text-xs text-muted-foreground">عناصر خزنتك الخاصة</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Access Logs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <Clock className="w-4 h-4" />
              آخر عمليات الوصول
            </h4>
            <Badge variant="outline" className="text-xs">
              آخر 10
            </Badge>
          </div>

          {stats?.recentAccessLogs.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              لا توجد عمليات وصول مسجلة
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {stats?.recentAccessLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {getAccessTypeIcon(log.access_type)}
                      <div>
                        <p className="text-sm font-medium">{getAccessTypeLabel(log.access_type)}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.profile_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      {log.resource_type && (
                        <Badge variant="outline" className="text-xs mb-1">
                          {log.resource_type}
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {log.accessed_at
                          ? new Date(log.accessed_at).toLocaleString('ar-SA', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Security Status */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/20">
          <CheckCircle className="w-4 h-4 text-success" />
          <span className="text-sm text-success-foreground">
            جميع الأسرار مشفرة بخوارزمية AES-256-GCM
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityDashboardWidget;
