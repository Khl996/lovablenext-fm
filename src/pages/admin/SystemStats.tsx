import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Building2, 
  Package, 
  ClipboardList, 
  Boxes,
  AlertTriangle,
  Clock,
  UserX,
  PackageX,
  AlertCircle,
  Shield,
  TrendingUp,
  Activity,
  Wrench
} from 'lucide-react';

interface SystemTotals {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalHospitals: number;
  totalAssets: number;
  activeAssets: number;
  maintenanceAssets: number;
  totalWorkOrders: number;
  openWorkOrders: number;
  completedWorkOrders: number;
  totalInventoryItems: number;
  inventoryValue: number;
  lowStockItems: number;
  totalTeams: number;
  activeTeams: number;
}

interface SystemAlert {
  id: string;
  type: 'sla_breach' | 'overdue_task' | 'inactive_user' | 'low_stock' | 'stuck_work_order';
  severity: 'high' | 'medium' | 'low';
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  timestamp?: string;
  link?: string;
}

export default function SystemStats() {
  const { language } = useLanguage();
  const { permissions, hospitalId } = useCurrentUser();
  const [totals, setTotals] = useState<SystemTotals>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalHospitals: 0,
    totalAssets: 0,
    activeAssets: 0,
    maintenanceAssets: 0,
    totalWorkOrders: 0,
    openWorkOrders: 0,
    completedWorkOrders: 0,
    totalInventoryItems: 0,
    inventoryValue: 0,
    lowStockItems: 0,
    totalTeams: 0,
    activeTeams: 0,
  });
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemStats();
  }, []);

  const loadSystemStats = async () => {
    try {
      setLoading(true);

      // Fetch all totals in parallel
      const [
        usersResult,
        hospitalsResult,
        assetsResult,
        workOrdersResult,
        inventoryResult,
        teamsResult,
        slaBreachesResult,
        overdueTasksResult,
        stuckWorkOrdersResult,
      ] = await Promise.all([
        // Users
        supabase.from('profiles').select('id, is_active, last_activity_at'),
        // Hospitals
        supabase.from('hospitals').select('id, status', { count: 'exact' }),
        // Assets
        supabase.from('assets').select('id, status'),
        // Work Orders
        supabase.from('work_orders').select('id, status, reported_at, updated_at'),
        // Inventory
        supabase.from('inventory_items').select('id, current_stock, min_stock, unit_cost'),
        // Teams
        supabase.from('teams').select('id, status'),
        // SLA Breaches (open)
        supabase.from('sla_breaches').select('id, breach_type, expected_time, work_order_id, status').eq('status', 'open'),
        // Overdue Tasks
        supabase.from('maintenance_tasks').select('id, name, name_ar, end_date, status')
          .lt('end_date', new Date().toISOString())
          .neq('status', 'completed'),
        // Stuck Work Orders (no update in 7+ days and not completed)
        supabase.from('work_orders').select('id, code, status, updated_at')
          .not('status', 'in', '("completed","cancelled","auto_closed")')
          .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      // Process users
      const users = usersResult.data || [];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const inactiveUsers = users.filter(u => 
        !u.is_active || 
        (u.last_activity_at && new Date(u.last_activity_at) < thirtyDaysAgo)
      );

      // Process assets
      const assets = assetsResult.data || [];
      const activeAssets = assets.filter(a => a.status === 'active').length;
      const maintenanceAssets = assets.filter(a => a.status === 'maintenance').length;

      // Process work orders
      const workOrders = workOrdersResult.data || [];
      const openStatuses = ['pending', 'assigned', 'in_progress', 'pending_supervisor_approval', 'pending_engineer_review', 'pending_reporter_closure'];
      const openWorkOrders = workOrders.filter(wo => openStatuses.includes(wo.status)).length;
      const completedWorkOrders = workOrders.filter(wo => wo.status === 'completed').length;

      // Process inventory
      const inventory = inventoryResult.data || [];
      const lowStockItems = inventory.filter(i => i.min_stock && i.current_stock <= i.min_stock);
      const inventoryValue = inventory.reduce((sum, item) =>
        sum + ((item.current_stock || 0) * (item.unit_cost || 0)), 0
      );

      // Process teams
      const teams = teamsResult.data || [];
      const activeTeams = teams.filter(t => t.status === 'active').length;

      setTotals({
        totalUsers: users.length,
        activeUsers: users.filter(u => u.is_active).length,
        inactiveUsers: inactiveUsers.length,
        totalHospitals: hospitalsResult.count || 0,
        totalAssets: assets.length,
        activeAssets,
        maintenanceAssets,
        totalWorkOrders: workOrders.length,
        openWorkOrders,
        completedWorkOrders,
        totalInventoryItems: inventory.length,
        inventoryValue,
        lowStockItems: lowStockItems.length,
        totalTeams: teams.length,
        activeTeams,
      });

      // Build alerts list
      const alertsList: SystemAlert[] = [];

      // SLA Breaches
      (slaBreachesResult.data || []).forEach(breach => {
        alertsList.push({
          id: `sla-${breach.id}`,
          type: 'sla_breach',
          severity: 'high',
          title: `SLA Breach: ${breach.breach_type}`,
          titleAr: `انتهاك SLA: ${breach.breach_type === 'response' ? 'وقت الاستجابة' : 'وقت الحل'}`,
          description: `Work order exceeded SLA time limit`,
          descriptionAr: `تجاوز أمر العمل الحد الزمني المسموح`,
          timestamp: breach.expected_time,
          link: breach.work_order_id ? `/work-orders/${breach.work_order_id}` : undefined,
        });
      });

      // Overdue Tasks
      (overdueTasksResult.data || []).forEach(task => {
        alertsList.push({
          id: `task-${task.id}`,
          type: 'overdue_task',
          severity: 'medium',
          title: `Overdue: ${task.name}`,
          titleAr: `متأخرة: ${task.name_ar}`,
          description: `Task was due on ${new Date(task.end_date).toLocaleDateString()}`,
          descriptionAr: `كانت المهمة مستحقة في ${new Date(task.end_date).toLocaleDateString('ar')}`,
          timestamp: task.end_date,
        });
      });

      // Inactive Users
      if (inactiveUsers.length > 0) {
        alertsList.push({
          id: 'inactive-users',
          type: 'inactive_user',
          severity: 'low',
          title: `${inactiveUsers.length} Inactive Users`,
          titleAr: `${inactiveUsers.length} مستخدم غير نشط`,
          description: `Users haven't logged in for 30+ days`,
          descriptionAr: `مستخدمون لم يسجلوا الدخول منذ 30+ يوم`,
          link: '/admin/users',
        });
      }

      // Low Stock Items
      if (lowStockItems.length > 0) {
        alertsList.push({
          id: 'low-stock',
          type: 'low_stock',
          severity: 'medium',
          title: `${lowStockItems.length} Low Stock Items`,
          titleAr: `${lowStockItems.length} عنصر منخفض المخزون`,
          description: `Items below minimum quantity threshold`,
          descriptionAr: `عناصر أقل من الحد الأدنى للكمية`,
          link: '/admin/inventory',
        });
      }

      // Stuck Work Orders
      (stuckWorkOrdersResult.data || []).slice(0, 5).forEach(wo => {
        alertsList.push({
          id: `stuck-${wo.id}`,
          type: 'stuck_work_order',
          severity: 'medium',
          title: `Stuck: ${wo.code}`,
          titleAr: `متوقف: ${wo.code}`,
          description: `No activity for 7+ days (Status: ${wo.status})`,
          descriptionAr: `لا نشاط منذ 7+ أيام (الحالة: ${wo.status})`,
          timestamp: wo.updated_at,
          link: `/work-orders/${wo.id}`,
        });
      });

      // Sort by severity
      alertsList.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      setAlerts(alertsList);
    } catch (error) {
      console.error('Error loading system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'sla_breach': return <Shield className="h-4 w-4" />;
      case 'overdue_task': return <Clock className="h-4 w-4" />;
      case 'inactive_user': return <UserX className="h-4 w-4" />;
      case 'low_stock': return <PackageX className="h-4 w-4" />;
      case 'stuck_work_order': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {language === 'ar' ? 'إحصائيات النظام' : 'System Statistics'}
        </h1>
        <p className="text-muted-foreground">
          {language === 'ar' 
            ? 'نظرة شاملة على حالة النظام والتنبيهات' 
            : 'Comprehensive overview of system status and alerts'}
        </p>
      </div>

      {/* Totals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users */}
        <Card className="border-l-4 border-l-info">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'المستخدمون' : 'Users'}
            </CardTitle>
            <Users className="h-5 w-5 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.totalUsers}</div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-success">{totals.activeUsers} {language === 'ar' ? 'نشط' : 'active'}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-destructive">{totals.inactiveUsers} {language === 'ar' ? 'غير نشط' : 'inactive'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Work Orders */}
        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'أوامر العمل' : 'Work Orders'}
            </CardTitle>
            <ClipboardList className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.totalWorkOrders}</div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-warning">{totals.openWorkOrders} {language === 'ar' ? 'مفتوح' : 'open'}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-success">{totals.completedWorkOrders} {language === 'ar' ? 'مكتمل' : 'completed'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Assets */}
        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'الأصول' : 'Assets'}
            </CardTitle>
            <Package className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.totalAssets}</div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-success">{totals.activeAssets} {language === 'ar' ? 'تعمل' : 'active'}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-warning">{totals.maintenanceAssets} {language === 'ar' ? 'صيانة' : 'maintenance'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Value */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'قيمة المخزون' : 'Inventory Value'}
            </CardTitle>
            <Boxes className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.inventoryValue)}</div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span>{totals.totalInventoryItems} {language === 'ar' ? 'صنف' : 'items'}</span>
              {totals.lowStockItems > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-destructive">{totals.lowStockItems} {language === 'ar' ? 'منخفض' : 'low'}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Teams */}
        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'الفرق' : 'Teams'}
            </CardTitle>
            <Wrench className="h-5 w-5 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.totalTeams}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {totals.activeTeams} {language === 'ar' ? 'فريق نشط' : 'active teams'}
            </div>
          </CardContent>
        </Card>

        {/* Hospitals */}
        <Card className="border-l-4 border-l-secondary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'المنشآت' : 'Facilities'}
            </CardTitle>
            <Building2 className="h-5 w-5 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.totalHospitals}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'منشأة مسجلة' : 'registered facilities'}
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'معدل الإنجاز' : 'Completion Rate'}
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totals.totalWorkOrders > 0 
                ? Math.round((totals.completedWorkOrders / totals.totalWorkOrders) * 100) 
                : 0}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {language === 'ar' ? 'أوامر العمل المكتملة' : 'work orders completed'}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="border-l-4 border-l-info">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'صحة النظام' : 'System Health'}
            </CardTitle>
            <Activity className="h-5 w-5 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {alerts.filter(a => a.severity === 'high').length === 0 
                ? (language === 'ar' ? 'جيد' : 'Good')
                : (language === 'ar' ? 'تحتاج انتباه' : 'Attention')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {alerts.length} {language === 'ar' ? 'تنبيه نشط' : 'active alerts'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {language === 'ar' ? 'التنبيهات والمشاكل' : 'Alerts & Issues'}
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ms-2">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{language === 'ar' ? 'لا توجد تنبيهات حالياً' : 'No active alerts'}</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {language === 'ar' ? alert.titleAr : alert.title}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            alert.severity === 'high' ? 'border-destructive text-destructive' :
                            alert.severity === 'medium' ? 'border-warning text-warning' :
                            'border-muted'
                          }`}
                        >
                          {alert.severity === 'high' ? (language === 'ar' ? 'عالي' : 'High') :
                           alert.severity === 'medium' ? (language === 'ar' ? 'متوسط' : 'Medium') :
                           (language === 'ar' ? 'منخفض' : 'Low')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'ar' ? alert.descriptionAr : alert.description}
                      </p>
                      {alert.timestamp && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.timestamp).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
