import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface WorkOrderData {
  date: string;
  completed: number;
  pending: number;
  inProgress: number;
}

export function WorkOrdersChart() {
  const { language } = useLanguage();
  const [data, setData] = useState<WorkOrderData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const chartData = await Promise.all(
        last7Days.map(async (date) => {
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);
          const nextDateStr = nextDate.toISOString().split('T')[0];

          const [completed, pending, inProgress] = await Promise.all([
            supabase
              .from('work_orders')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'completed')
              .gte('created_at', date)
              .lt('created_at', nextDateStr),
            supabase
              .from('work_orders')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'pending')
              .gte('created_at', date)
              .lt('created_at', nextDateStr),
            supabase
              .from('work_orders')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'in_progress')
              .gte('created_at', date)
              .lt('created_at', nextDateStr),
          ]);

          return {
            date: new Date(date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
              month: 'short',
              day: 'numeric',
            }),
            completed: completed.count || 0,
            pending: pending.count || 0,
            inProgress: inProgress.count || 0,
          };
        })
      );

      setData(chartData);
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'أوامر العمل - آخر 7 أيام' : 'Work Orders - Last 7 Days'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === 'ar' ? 'أوامر العمل - آخر 7 أيام' : 'Work Orders - Last 7 Days'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="date" 
              className="text-muted-foreground"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              className="text-muted-foreground"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar 
              dataKey="completed" 
              name={language === 'ar' ? 'مكتملة' : 'Completed'}
              fill="hsl(var(--success))" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="inProgress" 
              name={language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
              fill="hsl(var(--info))" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="pending" 
              name={language === 'ar' ? 'معلقة' : 'Pending'}
              fill="hsl(var(--warning))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
