import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDomains, useNetworks, useServerMutations } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Network,
  Search,
  Play,
  Loader2,
  Server,
  Monitor,
  Printer,
  Router,
  HelpCircle,
  CheckCircle,
  XCircle,
  Import,
  History,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanResult {
  id: string;
  ip_address: string;
  hostname: string | null;
  os_type: string | null;
  device_type: string;
  open_ports: string[];
  selected?: boolean;
}

interface ScanJob {
  id: string;
  name: string;
  ip_range: string;
  status: string;
  created_at: string;
  summary: { total: number; alive: number } | null;
}

type ScanJobRow = {
  id: string;
  name: string;
  ip_range: string;
  status: string | null;
  created_at: string | null;
  summary: unknown;
};

const NetworkScan: React.FC = () => {
  const { t, dir } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: domains } = useDomains();
  const { data: networks } = useNetworks();
  const { createServer } = useServerMutations();
  
  const [activeTab, setActiveTab] = useState('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanJobs, setScanJobs] = useState<ScanJob[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Form state
  const [scanName, setScanName] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedNetworkId, setSelectedNetworkId] = useState('');
  const [ipRange, setIpRange] = useState('');
  const [scanMode, setScanMode] = useState('basic');

  // Import form state
  const [importEnvironment, setImportEnvironment] = useState('production');
  const [importOwner, setImportOwner] = useState('');

  // Filter networks by selected domain
  const filteredNetworks = useMemo(() => {
    if (!selectedDomainId) return networks;
    return networks.filter(n => n.domain_id === selectedDomainId);
  }, [networks, selectedDomainId]);

  // Auto-fill IP range when network is selected
  React.useEffect(() => {
    if (selectedNetworkId) {
      const network = networks.find(n => n.id === selectedNetworkId);
      if (network?.subnet) {
        setIpRange(network.subnet);
      }
    }
  }, [selectedNetworkId, networks]);

  // Get selected items
  const selectedResults = useMemo(() => 
    scanResults.filter(r => r.selected), 
    [scanResults]
  );

  // Fetch scan history
  const fetchScanHistory = async () => {
    const { data, error } = await supabase
      .from('scan_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) {
      setScanJobs(data.map((row: ScanJobRow) => ({
        id: row.id,
        name: row.name,
        ip_range: row.ip_range,
        status: row.status || 'pending',
        created_at: row.created_at || new Date().toISOString(),
        summary: row.summary as { total: number; alive: number } | null,
      })));
    }
  };

  // Fetch results for a scan job
  const fetchScanResults = async (jobId: string) => {
    const { data, error } = await supabase
      .from('scan_results')
      .select('*')
      .eq('scan_job_id', jobId)
      .eq('is_imported', false);
    
    if (data) {
      setScanResults(data.map(r => ({ ...r, selected: false })) as ScanResult[]);
    }
  };

  // Start scan
  const handleStartScan = async () => {
    if (!scanName) {
      toast({
        title: t('common.error'),
        description: t('scan.nameRequired'),
        variant: 'destructive',
      });
      return;
    }

    // Use IP range from form or from network
    let scanIpRange = ipRange;
    if (!scanIpRange && selectedNetworkId) {
      const network = networks.find(n => n.id === selectedNetworkId);
      scanIpRange = network?.subnet || '';
    }

    if (!scanIpRange) {
      toast({
        title: t('common.error'),
        description: t('scan.ipRangeRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanResults([]);

    try {
      // Create scan job
      const { data: job, error: jobError } = await supabase
        .from('scan_jobs')
        .insert({
          name: scanName,
          domain_id: selectedDomainId || null,
          network_id: selectedNetworkId || null,
          ip_range: ipRange,
          scan_mode: scanMode,
          status: 'running',
          started_at: new Date().toISOString(),
          created_by: profile?.id,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Simulate scan progress (in production, this would call the edge function)
      const simulateScan = async () => {
        // Parse IP range and generate sample results
        const results = generateSampleResults(ipRange);
        
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 300));
          setScanProgress(i);
        }

        // Save results to database
        if (results.length > 0) {
          const { error: resultsError } = await supabase
            .from('scan_results')
            .insert(results.map(r => ({
              scan_job_id: job.id,
              ip_address: r.ip_address,
              hostname: r.hostname,
              os_type: r.os_type,
              device_type: r.device_type,
              open_ports: r.open_ports,
              last_seen: new Date().toISOString(),
            })));

          if (resultsError) console.error('Error saving results:', resultsError);
        }

        // Update job status
        await supabase
          .from('scan_jobs')
          .update({
            status: 'completed',
            finished_at: new Date().toISOString(),
            summary: { total: results.length, alive: results.length },
          })
          .eq('id', job.id);

        setScanResults(results.map(r => ({ ...r, id: crypto.randomUUID(), selected: false })));
        toast({
          title: t('common.success'),
          description: `${t('scan.discovered')} ${results.length} ${t('scan.devices')}`,
        });
      };

      await simulateScan();
      fetchScanHistory();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Generate sample results (simulate network scan)
  const generateSampleResults = (range: string): ScanResult[] => {
    // Parse CIDR or range
    const baseIp = range.split('/')[0].split('.').slice(0, 3).join('.');
    const results: ScanResult[] = [];
    
    // Generate 5-15 random devices
    const count = Math.floor(Math.random() * 10) + 5;
    for (let i = 1; i <= count; i++) {
      const lastOctet = Math.floor(Math.random() * 250) + 1;
      const deviceTypes = ['Server', 'Workstation', 'Network', 'Printer', 'Unknown'];
      const osTypes = ['Windows Server 2022', 'Windows 10', 'Ubuntu 22.04', 'Cisco IOS', null];
      const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
      
      results.push({
        id: crypto.randomUUID(),
        ip_address: `${baseIp}.${lastOctet}`,
        hostname: deviceType === 'Server' ? `srv-${lastOctet}` : deviceType === 'Workstation' ? `pc-${lastOctet}` : null,
        os_type: osTypes[Math.floor(Math.random() * osTypes.length)],
        device_type: deviceType,
        open_ports: generatePorts(deviceType),
        selected: false,
      });
    }
    
    return results;
  };

  const generatePorts = (deviceType: string): string[] => {
    switch (deviceType) {
      case 'Server':
        return ['22', '80', '443', '3389', '445'];
      case 'Workstation':
        return ['135', '445', '3389'];
      case 'Network':
        return ['22', '23', '80', '443'];
      case 'Printer':
        return ['80', '443', '9100'];
      default:
        return ['80'];
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    setScanResults(prev => 
      prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r)
    );
  };

  // Select all
  const selectAll = () => {
    const allSelected = scanResults.every(r => r.selected);
    setScanResults(prev => prev.map(r => ({ ...r, selected: !allSelected })));
  };

  // Import selected
  const handleImport = async () => {
    if (selectedResults.length === 0) {
      toast({
        title: t('common.error'),
        description: 'Please select devices to import',
        variant: 'destructive',
      });
      return;
    }

    try {
      for (const result of selectedResults) {
        await createServer({
          name: result.hostname || `Device-${result.ip_address.split('.').pop()}`,
          ip_address: result.ip_address,
          operating_system: result.os_type || 'Unknown',
          environment: importEnvironment,
          status: 'active',
          owner: importOwner,
          network_id: selectedNetworkId || null,
          notes: `Imported from network scan. Detected as: ${result.device_type}`,
        });
      }

      // Mark as imported
      const { error } = await supabase
        .from('scan_results')
        .update({ is_imported: true })
        .in('ip_address', selectedResults.map(r => r.ip_address));

      toast({
        title: t('common.success'),
        description: `Imported ${selectedResults.length} devices`,
      });

      setShowImportDialog(false);
      setScanResults(prev => prev.filter(r => !r.selected));
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Get device icon
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Server':
        return <Server className="w-4 h-4" />;
      case 'Workstation':
        return <Monitor className="w-4 h-4" />;
      case 'Printer':
        return <Printer className="w-4 h-4" />;
      case 'Network':
        return <Router className="w-4 h-4" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  // Access check
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('permissions.noAccess')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <Network className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('scan.title')}</h1>
          <p className="text-muted-foreground">
            {t('scan.discovered')} {scanResults.length} {t('scan.devices')}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scan" className="gap-2">
            <Search className="w-4 h-4" />
            {t('scan.startScan')}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            {t('scan.history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-6">
          {/* Scan Form */}
          <Card>
            <CardHeader>
              <CardTitle>{t('scan.startScan')}</CardTitle>
              <CardDescription>Enter IP range to discover devices on your network</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>{t('scan.scanName')}</Label>
                  <Input
                    value={scanName}
                    onChange={(e) => setScanName(e.target.value)}
                    placeholder="e.g., Office Network Scan"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('networks.domain')}</Label>
                  <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('servers.network')}</Label>
                  <Select value={selectedNetworkId} onValueChange={setSelectedNetworkId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredNetworks.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name} {n.subnet ? `(${n.subnet})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('scan.ipRange')} {selectedNetworkId && <span className="text-muted-foreground text-xs">({t('scan.autoFilledFromNetwork')})</span>}</Label>
                  <Input
                    value={ipRange}
                    onChange={(e) => setIpRange(e.target.value)}
                    placeholder={selectedNetworkId ? t('scan.optionalIfNetworkSelected') : 'e.g., 192.168.1.0/24'}
                  />
                  {!selectedNetworkId && (
                    <p className="text-xs text-muted-foreground">{t('scan.selectNetworkOrEnterIp')}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleStartScan} 
                  disabled={isScanning}
                  className="gap-2"
                >
                  {isScanning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isScanning ? t('scan.running') : t('scan.startScan')}
                </Button>
                
                {isScanning && (
                  <div className="flex-1 max-w-md">
                    <Progress value={scanProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{scanProgress}%</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {scanResults.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('scan.results')}</CardTitle>
                  <CardDescription>
                    {selectedResults.length} of {scanResults.length} selected
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {scanResults.every(r => r.selected) ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button 
                    size="sm" 
                    disabled={selectedResults.length === 0}
                    onClick={() => setShowImportDialog(true)}
                    className="gap-2"
                  >
                    <Import className="w-4 h-4" />
                    {t('scan.importSelected')} ({selectedResults.length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>{t('scan.hostname')}</TableHead>
                      <TableHead>{t('scan.deviceType')}</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>{t('scan.openPorts')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scanResults.map((result) => (
                      <TableRow key={result.id} className={cn(result.selected && 'bg-primary/5')}>
                        <TableCell>
                          <Checkbox
                            checked={result.selected}
                            onCheckedChange={() => toggleSelection(result.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono">{result.ip_address}</TableCell>
                        <TableCell>{result.hostname || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(result.device_type)}
                            <span>{t(`scan.${result.device_type.toLowerCase()}`)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{result.os_type || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {result.open_ports.slice(0, 4).map((port) => (
                              <Badge key={port} variant="outline" className="text-xs">
                                {port}
                              </Badge>
                            ))}
                            {result.open_ports.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{result.open_ports.length - 4}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('scan.history')}</CardTitle>
              <Button variant="outline" size="sm" onClick={fetchScanHistory}>
                <RefreshCw className="w-4 h-4 me-2" />
                {t('common.refresh')}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('scan.scanName')}</TableHead>
                    <TableHead>{t('scan.ipRange')}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{t('scan.discovered')}</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scanJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.name}</TableCell>
                      <TableCell className="font-mono">{job.ip_range}</TableCell>
                      <TableCell>
                        <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                          {job.status === 'completed' ? (
                            <CheckCircle className="w-3 h-3 me-1" />
                          ) : job.status === 'failed' ? (
                            <XCircle className="w-3 h-3 me-1" />
                          ) : (
                            <Loader2 className="w-3 h-3 me-1 animate-spin" />
                          )}
                          {t(`scan.${job.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>{job.summary?.alive || 0} devices</TableCell>
                      <TableCell>
                        {new Date(job.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            fetchScanResults(job.id);
                            setActiveTab('scan');
                          }}
                        >
                          View Results
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {scanJobs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No scan history yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('scan.importSelected')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              You are about to import {selectedResults.length} device(s) to the CMDB.
            </p>
            <div className="space-y-2">
              <Label>{t('servers.environment')}</Label>
              <Select value={importEnvironment} onValueChange={setImportEnvironment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">{t('env.production')}</SelectItem>
                  <SelectItem value="testing">{t('env.testing')}</SelectItem>
                  <SelectItem value="development">{t('env.development')}</SelectItem>
                  <SelectItem value="staging">{t('env.staging')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('servers.owner')}</Label>
              <Input
                value={importOwner}
                onChange={(e) => setImportOwner(e.target.value)}
                placeholder="e.g., IT Department"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleImport}>
              <Import className="w-4 h-4 me-2" />
              Import {selectedResults.length} Device(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NetworkScan;
