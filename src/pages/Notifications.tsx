/**
 * Notifications Page - Full notifications list with filters
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSite } from '@/contexts/SiteContext';
import { usePermissions, PERMISSION_KEYS } from '@/hooks/usePermissions';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  type Notification,
} from '@/hooks/useNotifications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
  Filter,
  Bot,
  Server,
  Shield,
  Eye,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import NoSiteSelected from '@/components/common/NoSiteSelected';
import { cn } from '@/lib/utils';

const Notifications: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { selectedSite } = useSite();
  const { hasPermission, isViewerOnly } = usePermissions();
  
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Fetch domains for filter
  const { data: domains = [] } = useQuery({
    queryKey: ['domains-for-filter', selectedSite?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domains')
        .select('id, name')
        .eq('site_id', selectedSite!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSite,
  });

  // Fetch notifications with filters
  const { data: notifications = [], isLoading } = useNotifications({
    siteId: selectedSite?.id,
    domainId: domainFilter !== 'all' ? domainFilter : undefined,
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    unreadOnly,
    limit: 100,
  });

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const canViewNotifications = hasPermission(PERMISSION_KEYS.GOV_NOTIFICATIONS_VIEW, { siteId: selectedSite?.id });

  if (!selectedSite) {
    return <NoSiteSelected />;
  }

  if (!canViewNotifications && !isViewerOnly) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>You don't have permission to view notifications.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Critical</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 gap-1"><AlertTriangle className="h-3 w-3" />Warning</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Info className="h-3 w-3" />Info</Badge>;
    }
  };

  const getEntityIcon = (entityType: string | null) => {
    switch (entityType) {
      case 'agent':
        return <Bot className="h-4 w-4 text-muted-foreground" />;
      case 'domain_integration':
        return <Server className="h-4 w-4 text-muted-foreground" />;
      case 'ad_snapshot':
        return <Shield className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleRowClick = (notification: Notification) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            System alerts and updates for your site
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Read-only banner for viewers */}
      {isViewerOnly && (
        <Alert className="border-warning/30 bg-warning/10">
          <Eye className="h-4 w-4" />
          <AlertDescription>
            You have read-only access to notifications.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {domains.map(domain => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Checkbox
                id="unread"
                checked={unreadOnly}
                onCheckedChange={(checked) => setUnreadOnly(!!checked)}
              />
              <label htmlFor="unread" className="text-sm cursor-pointer">
                Unread only
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {notifications.length > 0
              ? `${notifications.length} Notification${notifications.length !== 1 ? 's' : ''}`
              : 'No Notifications'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications to display.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map(notification => (
                  <TableRow
                    key={notification.id}
                    className={cn(
                      'cursor-pointer hover:bg-muted/50 transition-colors',
                      !notification.is_read && 'bg-primary/5'
                    )}
                    onClick={() => handleRowClick(notification)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                        {getEntityIcon(notification.entity_type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className={cn('font-medium', !notification.is_read && 'font-semibold')}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {notification.message}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(notification.severity)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {notification.code || notification.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span title={format(new Date(notification.created_at), 'PPpp')}>
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        {notification.link && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(notification.link!)}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Notification</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this notification?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground"
                                onClick={() => deleteNotification.mutate(notification.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
