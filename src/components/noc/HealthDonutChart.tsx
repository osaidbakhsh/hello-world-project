import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { HealthScore } from '@/hooks/useRealtimeHealth';
import { cn } from '@/lib/utils';

interface HealthDonutChartProps {
  health: HealthScore;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

const COLORS = {
  healthy: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  critical: 'hsl(var(--destructive))'
};

const HealthDonutChart: React.FC<HealthDonutChartProps> = ({
  health,
  title,
  subtitle,
  size = 'md'
}) => {
  const data = [
    { name: 'Healthy', value: health.healthy, color: COLORS.healthy },
    { name: 'Warning', value: health.warning, color: COLORS.warning },
    { name: 'Critical', value: health.critical, color: COLORS.critical }
  ].filter(d => d.value > 0);

  const statusConfig = {
    healthy: { icon: CheckCircle, class: 'text-success', label: 'Healthy' },
    warning: { icon: AlertTriangle, class: 'text-warning', label: 'Degraded' },
    critical: { icon: XCircle, class: 'text-destructive', label: 'Critical' }
  };

  const status = statusConfig[health.status];
  const StatusIcon = status.icon;

  const chartSize = size === 'sm' ? 120 : size === 'md' ? 160 : 200;
  const innerRadius = size === 'sm' ? 35 : size === 'md' ? 45 : 55;
  const outerRadius = size === 'sm' ? 50 : size === 'md' ? 65 : 80;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {title}
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn('text-xs', status.class)}
          >
            <StatusIcon className="w-3 h-3 me-1" />
            {status.label}
          </Badge>
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          {/* Donut Chart */}
          <div className="relative" style={{ width: chartSize, height: chartSize }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.length > 0 ? data : [{ name: 'Empty', value: 1, color: 'hsl(var(--muted))' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {(data.length > 0 ? data : [{ color: 'hsl(var(--muted))' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center percentage */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-2xl font-bold', status.class)}>
                {health.percentage}%
              </span>
              <span className="text-xs text-muted-foreground">uptime</span>
            </div>
          </div>

          {/* Stats breakdown */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-success/10">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-success" />
                <span className="text-xs">Online</span>
              </div>
              <span className="text-sm font-bold text-success">{health.healthy}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-warning/10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                <span className="text-xs">Warning</span>
              </div>
              <span className="text-sm font-bold text-warning">{health.warning}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-destructive/10">
              <div className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-destructive" />
                <span className="text-xs">Offline</span>
              </div>
              <span className="text-sm font-bold text-destructive">{health.critical}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthDonutChart;
