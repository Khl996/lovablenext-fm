import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Package } from 'lucide-react';

interface AssetStatusData {
  name: string;
  value: number;
  color: string;
}

export function AssetAvailabilityChart() {
  const { language } = useLanguage();
  const [data, setData] = useState<AssetStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [availabilityRate, setAvailabilityRate] = useState(0);

  useEffect(() => {
    loadAssetStatus();
  }, []);

  const loadAssetStatus = async () => {
    try {
      setLoading(true);

      // Fetch asset counts by status
      const { data: assets, error } = await supabase
        .from('assets')
        .select('status');

      if (error) throw error;

      // Count assets by status
      const statusCounts = assets?.reduce((acc, asset) => {
        const status = asset.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const total = assets?.length || 0;
      const active = statusCounts['active'] || 0;
      
      // Calculate availability rate (active assets / total assets)
      const rate = total > 0 ? Math.round((active / total) * 100) : 0;
      setAvailabilityRate(rate);

      // Prepare chart data
      const chartData: AssetStatusData[] = [
        {
          name: language === 'ar' ? 'نشط' : 'Active',
          value: statusCounts['active'] || 0,
          color: 'hsl(var(--success))'
        },
        {
          name: language === 'ar' ? 'تحت الصيانة' : 'Under Maintenance',
          value: statusCounts['under_maintenance'] || 0,
          color: 'hsl(var(--warning))'
        },
        {
          name: language === 'ar' ? 'غير نشط' : 'Inactive',
          value: (statusCounts['inactive'] || 0) + (statusCounts['decommissioned'] || 0),
          color: 'hsl(var(--destructive))'
        }
      ].filter(item => item.value > 0);

      setData(chartData);
    } catch (error) {
      console.error('Error loading asset status:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCustomLabel = ({ cx, cy }: any) => {
    return (
      <text
        x={cx}
        y={cy}
        fill="hsl(var(--foreground))"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-3xl font-bold"
      >
        {availabilityRate}%
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          {language === 'ar' ? 'توفر الأصول' : 'Asset Availability'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  innerRadius={80}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'نسبة الأصول النشطة من إجمالي الأصول' 
                  : 'Active assets percentage of total assets'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
