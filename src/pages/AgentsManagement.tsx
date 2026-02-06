/**
 * Agents Management Page
 */

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSite } from '@/contexts/SiteContext';
import { usePermissions, PERMISSION_KEYS } from '@/hooks/usePermissions';
import { useScanAgents, useCreateAgent, useDeleteAgent, useRotateAgentToken } from '@/hooks/useADIntegration';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
  Plus, 
  Bot, 
  Key, 
  Trash2, 
  RefreshCw, 
  Copy, 
  CheckCircle, 
  XCircle,
  Clock,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import NoSiteSelected from '@/components/common/NoSiteSelected';
import { toast } from 'sonner';

const AgentsManagement: React.FC = () => {
  const { t } = useLanguage();
  const { selectedSite } = useSite();
  const { hasPermission, isViewerOnly } = usePermissions();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [newAgentToken, setNewAgentToken] = useState<string | null>(null);
  const [rotatedToken, setRotatedToken] = useState<{ agentId: string; token: string } | null>(null);

  const { data: agents = [], isLoading } = useScanAgents();
  
  // Fetch domains with name for the selector
  const { data: domainsData = [] } = useQuery({
    queryKey: ['domains-for-agents', selectedSite?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('domains').select('id, name').eq('site_id', selectedSite!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSite,
  });
  
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();
  const rotateToken = useRotateAgentToken();

  const canViewAgents = hasPermission(PERMISSION_KEYS.INTEGRATIONS_AGENTS_VIEW, { siteId: selectedSite?.id });
  const canManageAgents = hasPermission(PERMISSION_KEYS.INTEGRATIONS_AGENTS_MANAGE, { siteId: selectedSite?.id });

  if (!selectedSite) {
    return <NoSiteSelected />;
  }

  if (!canViewAgents && !isViewerOnly) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>You don't have permission to view agents.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleCreateAgent = async () => {
    if (!newAgentName.trim() || !selectedDomainId) return;

    try {
      const result = await createAgent.mutateAsync({
        name: newAgentName,
        domain_id: selectedDomainId,
        site_id: selectedSite.id,
        agent_type: 'windows-ad',
      });
      
      setNewAgentToken(result.token);
      setNewAgentName('');
      setSelectedDomainId('');
    } catch (error) {
      console.error('Failed to create agent:', error);
    }
  };

  const handleRotateToken = async (agentId: string) => {
    try {
      const result = await rotateToken.mutateAsync(agentId);
      setRotatedToken({ agentId, token: result.token });
    } catch (error) {
      console.error('Failed to rotate token:', error);
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success('Token copied to clipboard');
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ONLINE':
        return <Badge className="bg-emerald-100 text-emerald-800"><CheckCircle className="w-3 h-3 mr-1" />Online</Badge>;
      case 'OFFLINE':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Offline</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scan Agents</h1>
          <p className="text-sm text-muted-foreground">Manage Windows agents for AD and file share scanning</p>
        </div>
        {canManageAgents && (
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setNewAgentToken(null);
              setNewAgentName('');
              setSelectedDomainId('');
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Register Agent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {newAgentToken ? 'Agent Created Successfully' : 'Register New Agent'}
                </DialogTitle>
                <DialogDescription>
                  {newAgentToken 
                    ? 'Save the token below. It will only be shown once!'
                    : 'Create a new scan agent for a domain.'}
                </DialogDescription>
              </DialogHeader>
              
              {newAgentToken ? (
                <div className="space-y-4">
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This token will only be shown once. Make sure to copy and save it securely.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label>Agent Token</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={newAgentToken} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleCopyToken(newAgentToken)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button onClick={() => {
                      setIsCreateOpen(false);
                      setNewAgentToken(null);
                    }}>
                      Done
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Agent Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., DC01-AD-Agent"
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain</Label>
                    <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {domainsData.map(domain => (
                          <SelectItem key={domain.id} value={domain.id}>
                            {domain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateAgent}
                      disabled={!newAgentName.trim() || !selectedDomainId || createAgent.isPending}
                    >
                      {createAgent.isPending ? 'Creating...' : 'Create Agent'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Read-only banner for viewers */}
      {isViewerOnly && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <Eye className="h-4 w-4" />
          <AlertDescription>
            You have read-only access to agent management.
          </AlertDescription>
        </Alert>
      )}

      {/* Rotated Token Dialog */}
      {rotatedToken && (
        <Dialog open={true} onOpenChange={() => setRotatedToken(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Token Rotated Successfully</DialogTitle>
              <DialogDescription>
                Save the new token below. The old token is now invalid.
              </DialogDescription>
            </DialogHeader>
            
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This token will only be shown once. Update your agent configuration.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label>New Agent Token</Label>
              <div className="flex gap-2">
                <Input 
                  value={rotatedToken.token} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleCopyToken(rotatedToken.token)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={() => setRotatedToken(null)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered Agents ({agents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No agents registered yet.</p>
              {canManageAgents && (
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Register First Agent
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Last Seen</TableHead>
                  {canManageAgents && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map(agent => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        {agent.name}
                      </div>
                    </TableCell>
                    <TableCell>{(agent as any).domains?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{agent.agent_type || 'file-scanner'}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(agent.status)}</TableCell>
                    <TableCell>{agent.version || '—'}</TableCell>
                    <TableCell>
                      {agent.last_seen_at ? (
                        <span className="text-sm" title={format(new Date(agent.last_seen_at), 'PPpp')}>
                          {formatDistanceToNow(new Date(agent.last_seen_at), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    {canManageAgents && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRotateToken(agent.id)}
                            disabled={rotateToken.isPending}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Rotate
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{agent.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground"
                                  onClick={() => deleteAgent.mutate(agent.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Agent Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Setup</CardTitle>
          <CardDescription>
            Follow these steps to set up a Windows agent for Active Directory integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <p className="font-medium">Register an agent above</p>
                <p className="text-sm text-muted-foreground">Create a new agent and save the generated token securely.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <p className="font-medium">Download the Windows agent</p>
                <p className="text-sm text-muted-foreground">Install on a domain-joined Windows server with access to AD.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">3</div>
              <div>
                <p className="font-medium">Configure the agent</p>
                <p className="text-sm text-muted-foreground">Enter your token, site code, and domain FQDN in the agent config.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">4</div>
              <div>
                <p className="font-medium">Start the agent service</p>
                <p className="text-sm text-muted-foreground">The agent will begin pushing AD metrics automatically.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentsManagement;
