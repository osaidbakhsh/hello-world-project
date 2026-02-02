import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDomains } from '@/hooks/useSupabaseData';
import { useClusters, useClusterNodes, useVMs, useDatacenterStats } from '@/hooks/useDatacenter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Database, 
  Plus,
  FileDown,
  FileUp,
  LayoutGrid,
  Network,
  Monitor,
  Layers,
  Building2
} from 'lucide-react';
import DatacenterOverview from '@/components/datacenter/DatacenterOverview';
import NodeTable from '@/components/datacenter/NodeTable';
import VMTable from '@/components/datacenter/VMTable';
import TopologyView from '@/components/datacenter/TopologyView';
import ClusterForm from '@/components/datacenter/ClusterForm';
import DatacenterForm from '@/components/datacenter/DatacenterForm';
import ClusterTable from '@/components/datacenter/ClusterTable';
import DatacenterTable from '@/components/datacenter/DatacenterTable';

const Datacenter: React.FC = () => {
  const { t, language } = useLanguage();
  const { data: domains, isLoading: domainsLoading } = useDomains();
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [showClusterForm, setShowClusterForm] = useState(false);
  const [showDatacenterForm, setShowDatacenterForm] = useState(false);

  const { data: clusters } = useClusters(selectedDomainId || undefined);
  const stats = useDatacenterStats(selectedDomainId || undefined);

  // Set first domain as default when loaded
  React.useEffect(() => {
    if (domains?.length && !selectedDomainId) {
      setSelectedDomainId(domains[0].id);
    }
  }, [domains, selectedDomainId]);

  if (domainsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="w-7 h-7" />
            {t('datacenter.title')}
          </h1>
          <p className="text-muted-foreground">{t('datacenter.subtitle')}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Domain Selector */}
          <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('common.selectDomain')} />
            </SelectTrigger>
            <SelectContent>
              {domains?.map((domain) => (
                <SelectItem key={domain.id} value={domain.id}>
                  {domain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          <Button variant="outline" onClick={() => setShowDatacenterForm(true)}>
            <Plus className="w-4 h-4 me-2" />
            {language === 'ar' ? 'إضافة مركز بيانات' : 'Add Datacenter'}
          </Button>
          <Button onClick={() => setShowClusterForm(true)}>
            <Plus className="w-4 h-4 me-2" />
            {t('datacenter.addCluster')}
          </Button>
          <Button variant="outline">
            <FileUp className="w-4 h-4 me-2" />
            {t('common.import')}
          </Button>
          <Button variant="outline">
            <FileDown className="w-4 h-4 me-2" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {!selectedDomainId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('common.selectDomain')}</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              {t('datacenter.overview')}
            </TabsTrigger>
            <TabsTrigger value="datacenters" className="gap-2">
              <Building2 className="w-4 h-4" />
              {language === 'ar' ? 'مراكز البيانات' : 'Datacenters'}
            </TabsTrigger>
            <TabsTrigger value="clusters" className="gap-2">
              <Layers className="w-4 h-4" />
              {t('datacenter.clustersTab')}
            </TabsTrigger>
            <TabsTrigger value="physical" className="gap-2">
              <Cpu className="w-4 h-4" />
              {t('datacenter.physical')}
            </TabsTrigger>
            <TabsTrigger value="virtualization" className="gap-2">
              <Monitor className="w-4 h-4" />
              {t('datacenter.virtualization')}
            </TabsTrigger>
            <TabsTrigger value="topology" className="gap-2">
              <Network className="w-4 h-4" />
              {t('datacenter.topology')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DatacenterOverview 
              domainId={selectedDomainId} 
              stats={stats}
              clusters={clusters || []}
            />
          </TabsContent>

          <TabsContent value="datacenters">
            <DatacenterTable domainId={selectedDomainId} />
          </TabsContent>

          <TabsContent value="clusters">
            <ClusterTable domainId={selectedDomainId} />
          </TabsContent>

          <TabsContent value="physical">
            <NodeTable domainId={selectedDomainId} />
          </TabsContent>

          <TabsContent value="virtualization">
            <VMTable domainId={selectedDomainId} />
          </TabsContent>

          <TabsContent value="topology">
            <TopologyView domainId={selectedDomainId} />
          </TabsContent>
        </Tabs>
      )}

      {/* Cluster Form Dialog */}
      {showClusterForm && (
        <ClusterForm
          domainId={selectedDomainId}
          onClose={() => setShowClusterForm(false)}
        />
      )}

      {/* Datacenter Form Dialog */}
      {showDatacenterForm && (
        <DatacenterForm
          domainId={selectedDomainId}
          onClose={() => setShowDatacenterForm(false)}
        />
      )}
    </div>
  );
};

export default Datacenter;
