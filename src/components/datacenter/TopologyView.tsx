import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClusters, useClusterNodes, useVMs, useDatacenters } from '@/hooks/useDatacenter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Server, Cpu, Monitor, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  domainId: string;
}

const TopologyView: React.FC<Props> = ({ domainId }) => {
  const { t, language } = useLanguage();
  const { data: datacenters } = useDatacenters(domainId);
  const { data: clusters } = useClusters(domainId);
  const { data: nodes } = useClusterNodes(domainId);
  const { data: vms } = useVMs(domainId);

  const [expandedClusters, setExpandedClusters] = React.useState<Set<string>>(new Set());
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());

  const toggleCluster = (id: string) => {
    const newSet = new Set(expandedClusters);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedClusters(newSet);
  };

  const toggleNode = (id: string) => {
    const newSet = new Set(expandedNodes);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedNodes(newSet);
  };

  const getClusterNodes = (clusterId: string) => 
    nodes?.filter(n => n.cluster_id === clusterId) || [];

  const getNodeVMs = (nodeId: string) => 
    vms?.filter(v => v.host_node_id === nodeId) || [];

  const getUnassignedVMs = (clusterId: string) =>
    vms?.filter(v => v.cluster_id === clusterId && !v.host_node_id) || [];

  const clusterTypeIcons: Record<string, string> = {
    vmware: '🟢',
    nutanix: '🔵',
    hyperv: '🟣',
    other: '⚪',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          {t('datacenter.topology')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 font-mono text-sm">
          {/* Domain Level */}
          <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="font-semibold">{language === 'ar' ? 'النطاق' : 'Domain'}</span>
          </div>

          {/* Clusters */}
          {clusters?.length === 0 ? (
            <div className="ps-8 py-4 text-muted-foreground">
              {t('datacenter.noClusters')}
            </div>
          ) : (
            <div className="ps-4 border-s-2 border-dashed border-muted ms-3">
              {clusters?.map((cluster) => {
                const clusterNodes = getClusterNodes(cluster.id);
                const unassignedVMs = getUnassignedVMs(cluster.id);
                const isExpanded = expandedClusters.has(cluster.id);

                return (
                  <div key={cluster.id} className="my-2">
                    {/* Cluster Row */}
                    <button
                      onClick={() => toggleCluster(cluster.id)}
                      className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg w-full text-start"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <Server className="w-4 h-4 text-accent" />
                      <span className="me-2">{clusterTypeIcons[cluster.cluster_type || 'other']}</span>
                      <span className="font-medium">{cluster.name}</span>
                      <Badge variant="outline" className="ms-2">
                        {cluster.cluster_type?.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary" className="ms-auto">
                        {clusterNodes.length} {t('datacenter.nodes')}
                      </Badge>
                    </button>

                    {/* Nodes */}
                    {isExpanded && (
                      <div className="ps-6 border-s-2 border-dashed border-muted ms-5">
                        {clusterNodes.map((node) => {
                          const nodeVMs = getNodeVMs(node.id);
                          const isNodeExpanded = expandedNodes.has(node.id);

                          return (
                            <div key={node.id} className="my-1">
                              <button
                                onClick={() => toggleNode(node.id)}
                                className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg w-full text-start"
                              >
                                {nodeVMs.length > 0 ? (
                                  isNodeExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )
                                ) : (
                                  <span className="w-4" />
                                )}
                                <Cpu className="w-4 h-4 text-blue-500" />
                                <span>{node.name}</span>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "ms-2",
                                    node.status === 'active' && "border-green-500 text-green-600",
                                    node.status === 'maintenance' && "border-yellow-500 text-yellow-600"
                                  )}
                                >
                                  {node.status}
                                </Badge>
                                {nodeVMs.length > 0 && (
                                  <Badge variant="secondary" className="ms-auto">
                                    {nodeVMs.length} VMs
                                  </Badge>
                                )}
                              </button>

                              {/* VMs on this node */}
                              {isNodeExpanded && nodeVMs.length > 0 && (
                                <div className="ps-10 space-y-1">
                                  {nodeVMs.map((vm) => (
                                    <div
                                      key={vm.id}
                                      className="flex items-center gap-2 p-1.5 text-muted-foreground hover:text-foreground"
                                    >
                                      <Monitor className="w-3.5 h-3.5" />
                                      <span>{vm.name}</span>
                                      <span className="text-xs">({vm.os || 'Unknown'})</span>
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "ms-auto text-xs",
                                          vm.status === 'running' && "border-green-500 text-green-600"
                                        )}
                                      >
                                        {vm.status}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Unassigned VMs */}
                        {unassignedVMs.length > 0 && (
                          <div className="my-2 p-2 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-2">
                              {language === 'ar' ? 'غير مرتبطة بنود' : 'Unassigned to host'}
                            </div>
                            {unassignedVMs.map((vm) => (
                              <div
                                key={vm.id}
                                className="flex items-center gap-2 p-1 text-muted-foreground"
                              >
                                <Monitor className="w-3.5 h-3.5" />
                                <span>{vm.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TopologyView;
