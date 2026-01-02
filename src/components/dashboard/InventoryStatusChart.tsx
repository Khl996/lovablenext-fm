import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface InventoryStatus {
  name: string;
  value: number;
  color: string;
}

export function InventoryStatusChart() {
  const { language } = useLanguage();
  const [data, setData] = useState<InventoryStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventoryStatus();
  }, []);

  const loadInventoryStatus = async () => {
    try {
      setLoading(true);

      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('current_stock, min_stock, max_stock');

      if (error) throw error;

      const lowStock = items?.filter(
        item => item.min_stock && item.current_stock <= item.min_stock
      ).length || 0;

      const overStock = items?.filter(
        item => item.max_stock && item.current_stock >= item.max_stock
      ).length || 0;

      const optimal = (items?.length || 0) - lowStock - overStock;

      setData([
        {
          name: language === 'ar' ? 'مخزون منخفض' : 'Low Stock',
          value: lowStock,
          color: 'hsl(var(--destructive))',
        },
        {
          name: language === 'ar' ? 'مخزون مثالي' : 'Optimal Stock',
          value: optimal,
          color: 'hsl(var(--success))',
        },
        {
          name: language === 'ar' ? 'مخزون زائد' : 'Over Stock',
          value: overStock,
          color: 'hsl(var(--warning))',
        },
      ].filter(item => item.value > 0));
    } catch (error) {
      console.error('Error loading inventory status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'حالة المخزون' : 'Inventory Status'}
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
          {language === 'ar' ? 'حالة المخزون' : 'Inventory Status'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
