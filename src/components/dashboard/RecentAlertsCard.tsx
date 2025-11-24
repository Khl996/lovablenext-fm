import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface Alert {
  id: string;
  type: 'overdue' | 'low_stock' | 'critical';
  title: string;
  title_ar: string;
  timestamp: string;
  severity: 'high' | 'medium' | 'low';
}

export function RecentAlertsCard() {
  const { language } = useLanguage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const alertsList: Alert[] = [];

      // Check urgent/high priority work orders
      const { data: urgentWorkOrders } = await supabase
        .from('work_orders')
        .select('id, code, title, title_ar, created_at, lookup_priorities(name, name_ar)')
        .in('priority', ['urgent', 'high'])
        .not('status', 'in', '(completed,cancelled,auto_closed)')
        .limit(3);

      urgentWorkOrders?.forEach((wo: any) => {
        alertsList.push({
          id: wo.id,
          type: 'critical',
          title: `Urgent work order: ${wo.code} - ${wo.title}`,
          title_ar: `أمر عمل عاجل: ${wo.code} - ${wo.title_ar}`,
          timestamp: wo.created_at,
          severity: 'high',
        });
      });

      // Check overdue maintenance tasks
      const { data: overdueTasks } = await supabase
        .from('maintenance_tasks')
        .select('id, name, name_ar, end_date')
        .lt('end_date', new Date().toISOString())
        .neq('status', 'completed')
        .limit(3);

      overdueTasks?.forEach((task) => {
        alertsList.push({
          id: task.id,
          type: 'overdue',
          title: `Overdue task: ${task.name}`,
          title_ar: `مهمة متأخرة: ${task.name_ar}`,
          timestamp: task.end_date,
          severity: 'high',
        });
      });

      // Check low stock items
      const { data: lowStockItems } = await supabase
        .from('inventory_items')
        .select('id, name, name_ar, current_quantity, min_quantity, updated_at')
        .not('min_quantity', 'is', null)
        .limit(3);

      lowStockItems?.forEach((item) => {
        if (item.min_quantity && item.current_quantity <= item.min_quantity) {
          alertsList.push({
            id: item.id,
            type: 'low_stock',
            title: `Low stock: ${item.name}`,
            title_ar: `مخزون منخفض: ${item.name_ar}`,
            timestamp: item.updated_at,
            severity: 'medium',
          });
        }
      });

      // Sort by severity and timestamp
      alertsList.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      setAlerts(alertsList.slice(0, 5));
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'overdue':
        return <Clock className="h-4 w-4" />;
      case 'low_stock':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityVariant = (severity: Alert['severity']) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {language === 'ar' ? 'التنبيهات الأخيرة' : 'Recent Alerts'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {language === 'ar' ? 'التنبيهات الأخيرة' : 'Recent Alerts'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className={`mt-0.5 ${alert.severity === 'high' ? 'text-destructive' : 'text-warning'}`}>
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {language === 'ar' ? alert.title_ar : alert.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(alert.timestamp), {
                    addSuffix: true,
                    locale: language === 'ar' ? ar : enUS,
                  })}
                </p>
              </div>
              <Badge variant={getSeverityVariant(alert.severity)}>
                {language === 'ar'
                  ? alert.severity === 'high'
                    ? 'عالي'
                    : alert.severity === 'medium'
                    ? 'متوسط'
                    : 'منخفض'
                  : alert.severity}
              </Badge>
            </div>
          ))}
          {alerts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {language === 'ar' ? 'لا توجد تنبيهات' : 'No alerts'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
