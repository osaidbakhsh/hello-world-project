import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileCheck, 
  AlertCircle,
  ChevronRight,
  Eye,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSite } from '@/contexts/SiteContext';
import { usePermissions, PERMISSION_KEYS } from '@/hooks/usePermissions';
import { 
  useApprovals, 
  useApprovalDetail,
  useApprovalEvents,
  useDecideApproval,
  type ApprovalRequest,
  type ApprovalStatus,
} from '@/hooks/useApprovals';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable, type ColumnDef } from '@/components/common/DataTable';
import NoSiteSelected from '@/components/common/NoSiteSelected';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: FileCheck },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200', icon: XCircle },
  applied: { label: 'Applied', color: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground', icon: XCircle },
};

const ENTITY_TYPES = [
  { value: 'role_assignment', label: 'Role Assignment' },
  { value: 'domain_integration', label: 'Domain Integration' },
  { value: 'maintenance_window', label: 'Maintenance Window' },
];

const Approvals: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { selectedSite } = useSite();
  const { hasPermission, canManageRBAC, isSuperAdmin } = usePermissions();
  
  // State
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('pending');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);

  // Check permission
  const canViewApprovals = hasPermission(PERMISSION_KEYS.GOV_APPROVALS_VIEW);
  const canManageApprovals = hasPermission(PERMISSION_KEYS.GOV_APPROVALS_MANAGE) || canManageRBAC || isSuperAdmin;

  // Queries
  const { data: approvals = [], isLoading } = useApprovals({
    status: statusFilter === 'all' ? undefined : statusFilter,
    entity_type: entityTypeFilter === 'all' ? undefined : entityTypeFilter,
  });

  const { data: requestDetail } = useApprovalDetail(selectedRequest?.id || null);
  const { data: events = [] } = useApprovalEvents(selectedRequest?.id || null);
  const decideMutation = useDecideApproval();

  // Handle decision
  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedRequest) return;
    
    setIsDeciding(true);
    try {
      await decideMutation.mutateAsync({
        id: selectedRequest.id,
        decision,
        decision_notes: decisionNotes || undefined,
      });
      setSelectedRequest(null);
      setDecisionNotes('');
    } finally {
      setIsDeciding(false);
    }
  };

  // Table columns
  const columns: ColumnDef<ApprovalRequest>[] = [
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (row) => {
        const config = STATUS_CONFIG[row.status];
        const Icon = config.icon;
        return (
          <Badge className={cn("gap-1", config.color)}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: 'entity_type',
      header: 'Type',
      accessorKey: 'entity_type',
      sortable: true,
      cell: (row) => {
        const type = ENTITY_TYPES.find(t => t.value === row.entity_type);
        return <span className="capitalize">{type?.label || row.entity_type.replace('_', ' ')}</span>;
      },
    },
    {
      id: 'action_type',
      header: 'Action',
      accessorKey: 'action_type',
      sortable: true,
      cell: (row) => (
        <Badge variant="outline" className="capitalize">
          {row.action_type}
        </Badge>
      ),
    },
    {
      id: 'requester',
      header: 'Requested By',
      accessorFn: (row) => row.requester?.full_name || 'Unknown',
      sortable: true,
    },
    {
      id: 'created_at',
      header: 'Submitted',
      accessorKey: 'created_at',
      sortable: true,
      cell: (row) => (
        <span className="text-muted-foreground text-sm">
          {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setSelectedRequest(row)}
        >
          <Eye className="h-4 w-4 mr-1" />
          Review
        </Button>
      ),
    },
  ];

  if (!selectedSite) {
    return <NoSiteSelected />;
  }

  if (!canViewApprovals) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view approval requests.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approval Requests</h1>
          <p className="text-sm text-muted-foreground">
            Review and manage pending approval requests for sensitive actions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['pending', 'approved', 'rejected', 'applied'] as ApprovalStatus[]).map((status) => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          const count = approvals.filter(a => statusFilter === 'all' ? a.status === status : false).length;
          
          return (
            <Card 
              key={status}
              className={cn(
                "cursor-pointer transition-colors",
                statusFilter === status && "ring-2 ring-primary"
              )}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : count}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as ApprovalStatus | 'all')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ENTITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <DataTable
        data={approvals}
        columns={columns}
        isLoading={isLoading}
        getRowKey={(row) => row.id}
        searchPlaceholder="Search approvals..."
        emptyMessage="No approval requests found"
      />

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approval Request Details</DialogTitle>
          </DialogHeader>

          {requestDetail && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-4">
                <Badge className={cn("gap-1", STATUS_CONFIG[requestDetail.status].color)}>
                  {STATUS_CONFIG[requestDetail.status].label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Submitted {formatDistanceToNow(new Date(requestDetail.created_at), { addSuffix: true })}
                </span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Entity Type:</span>
                  <p className="font-medium capitalize">{requestDetail.entity_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Action:</span>
                  <p className="font-medium capitalize">{requestDetail.action_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Requested By:</span>
                  <p className="font-medium">{requestDetail.requester?.full_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Scope:</span>
                  <p className="font-medium capitalize">{requestDetail.scope_type}</p>
                </div>
              </div>

              {/* Request notes */}
              {requestDetail.requester_notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes:</span>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{requestDetail.requester_notes}</p>
                </div>
              )}

              {/* Request data preview */}
              {requestDetail.request_data && Object.keys(requestDetail.request_data).length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Request Data:</span>
                  <pre className="text-xs mt-1 p-3 bg-muted rounded-lg overflow-auto max-h-48">
                    {JSON.stringify(requestDetail.request_data, null, 2)}
                  </pre>
                </div>
              )}

              {/* Events timeline */}
              {events.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Timeline:</span>
                  <div className="mt-2 space-y-2">
                    {events.map((event) => (
                      <div key={event.id} className="flex items-start gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <div>
                          <span className="font-medium">{event.event_type}</span>
                          {event.actor?.full_name && (
                            <span className="text-muted-foreground"> by {event.actor.full_name}</span>
                          )}
                          <span className="text-muted-foreground">
                            {' '}• {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                          </span>
                          {event.message && <p className="text-muted-foreground">{event.message}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision section */}
              {requestDetail.status === 'pending' && canManageApprovals && (
                <div className="border-t pt-4 space-y-4">
                  <Label>Decision Notes (optional)</Label>
                  <Textarea
                    placeholder="Add notes for your decision..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {requestDetail?.status === 'pending' && canManageApprovals && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleDecision('rejected')}
                  disabled={isDeciding}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleDecision('approved')}
                  disabled={isDeciding}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Approvals;
