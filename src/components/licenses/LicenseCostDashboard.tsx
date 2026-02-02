import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, TrendingUp, Building2, AlertTriangle } from 'lucide-react';
import type { License } from '@/types/supabase-models';

interface LicenseCostDashboardProps {
  licenses: License[];
  domains: Array<{ id: string; name: string }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const LicenseCostDashboard: React.FC<LicenseCostDashboardProps> = ({ licenses, domains }) => {
  const { t, language, dir } = useLanguage();

  // Calculate cost statistics by domain
  const domainCostData = useMemo(() => {
    const costByDomain: Record<string, { name: string; cost: number; count: number }> = {};
    
    // Initialize with all domains
    domains.forEach(d => {
      costByDomain[d.id] = { name: d.name, cost: 0, count: 0 };
    });
    
    // Add "unassigned" category
    costByDomain['unassigned'] = { 
      name: language === 'ar' ? 'غير مصنف' : 'Unassigned', 
      cost: 0, 
      count: 0 
    };

    licenses.forEach(license => {
      const domainKey = license.domain_id || 'unassigned';
      if (costByDomain[domainKey]) {
        costByDomain[domainKey].cost += license.cost || 0;
        costByDomain[domainKey].count += 1;
      } else if (domainKey !== 'unassigned') {
        // Domain not in list (might have been deleted)
        costByDomain['unassigned'].cost += license.cost || 0;
        costByDomain['unassigned'].count += 1;
      }
    });

    return Object.values(costByDomain)
      .filter(d => d.cost > 0 || d.count > 0)
      .sort((a, b) => b.cost - a.cost);
  }, [licenses, domains, language]);

  // Calculate totals
  const totalStats = useMemo(() => {
    const total = licenses.reduce((sum, l) => sum + (l.cost || 0), 0);
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    
    const expiringSoonCost = licenses
      .filter(l => {
        if (!l.expiry_date) return false;
        const expiry = new Date(l.expiry_date);
        return expiry > now && expiry.getTime() - now.getTime() <= thirtyDays;
      })
      .reduce((sum, l) => sum + (l.cost || 0), 0);

    const expiredCost = licenses
      .filter(l => l.expiry_date && new Date(l.expiry_date) < now)
      .reduce((sum, l) => sum + (l.cost || 0), 0);

    return {
      total,
      expiringSoonCost,
      expiredCost,
      activeCost: total - expiredCost,
    };
  }, [licenses]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Pie chart data for top domains
  const pieData = domainCostData.slice(0, 5).map((d, index) => ({
    name: d.name,
    value: d.cost,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <div className="space-y-6" dir={dir}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalStats.total)}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'إجمالي التكلفة' : 'Total Cost'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalStats.activeCost)}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'التراخيص النشطة' : 'Active Licenses'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalStats.expiringSoonCost)}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'تنتهي قريباً' : 'Expiring Soon'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Building2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalStats.expiredCost)}</p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'منتهية الصلاحية' : 'Expired'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Cost by Domain */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {language === 'ar' ? 'التكلفة حسب النطاق' : 'Cost by Domain'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'توزيع تكاليف التراخيص على النطاقات' : 'License cost distribution across domains'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {domainCostData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={domainCostData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), language === 'ar' ? 'التكلفة' : 'Cost']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Top Domains Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {language === 'ar' ? 'توزيع التكلفة' : 'Cost Distribution'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'أعلى 5 نطاقات من حيث التكلفة' : 'Top 5 domains by cost'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Domain Cost Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'تفاصيل التكلفة حسب النطاق' : 'Cost Details by Domain'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-start py-3 px-4 font-medium">
                    {language === 'ar' ? 'النطاق' : 'Domain'}
                  </th>
                  <th className="text-start py-3 px-4 font-medium">
                    {language === 'ar' ? 'عدد التراخيص' : 'License Count'}
                  </th>
                  <th className="text-start py-3 px-4 font-medium">
                    {language === 'ar' ? 'التكلفة الإجمالية' : 'Total Cost'}
                  </th>
                  <th className="text-start py-3 px-4 font-medium">
                    {language === 'ar' ? 'متوسط التكلفة' : 'Average Cost'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {domainCostData.map((domain, index) => (
                  <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{domain.name}</td>
                    <td className="py-3 px-4">{domain.count}</td>
                    <td className="py-3 px-4">{formatCurrency(domain.cost)}</td>
                    <td className="py-3 px-4">
                      {domain.count > 0 ? formatCurrency(domain.cost / domain.count) : '-'}
                    </td>
                  </tr>
                ))}
                {domainCostData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      {language === 'ar' ? 'لا توجد تراخيص' : 'No licenses found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LicenseCostDashboard;
