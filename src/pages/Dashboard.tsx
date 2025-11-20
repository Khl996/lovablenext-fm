import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Package, 
  ClipboardList, 
  CheckCircle2,
  Download,
  X,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { WorkOrdersChart } from '@/components/dashboard/WorkOrdersChart';
import { InventoryStatusChart } from '@/components/dashboard/InventoryStatusChart';
import { TeamPerformanceCard } from '@/components/dashboard/TeamPerformanceCard';
import { RecentAlertsCard } from '@/components/dashboard/RecentAlertsCard';

interface DashboardStats {
  activeWorkOrders: number;
  completedWorkOrders: number;
  overdueTasks: number;
  dailyReports: number;
  totalAssets: number;
  lowStockItems: number;
  completionRate: number;
  avgResponseTime: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { language, setLanguage, t, direction } = useLanguage();
  const { isInstalled, isInstallable, installPWA } = usePWAInstall();
  const [stats, setStats] = useState<DashboardStats>({
    activeWorkOrders: 0,
    completedWorkOrders: 0,
    overdueTasks: 0,
    dailyReports: 0,
    totalAssets: 0,
    lowStockItems: 0,
    completionRate: 0,
    avgResponseTime: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadDashboardStats();
    }
  }, [user]);

  const loadDashboardStats = async () => {
    try {
      setLoadingStats(true);

      const today = new Date().toISOString().split('T')[0];

      const [
        dailyReports,
        activeOrders,
        completedOrders,
        overdueTasks,
        assets,
        inventoryItems,
        allOrders,
      ] = await Promise.all([
        supabase
          .from('work_orders')
          .select('*', { count: 'exact', head: true })
          .gte('reported_at', today),
        supabase
          .from('work_orders')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'assigned', 'in_progress']),
        supabase
          .from('work_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed'),
        supabase
          .from('maintenance_tasks')
          .select('*', { count: 'exact', head: true })
          .lt('end_date', new Date().toISOString())
          .neq('status', 'completed'),
        supabase
          .from('assets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('inventory_items')
          .select('current_quantity, min_quantity'),
        supabase
          .from('work_orders')
          .select('created_at, assigned_at')
          .not('assigned_at', 'is', null)
          .limit(100),
      ]);

      const lowStock = inventoryItems.data?.filter(
        item => item.min_quantity && item.current_quantity <= item.min_quantity
      ).length || 0;

      const totalOrders = (activeOrders.count || 0) + (completedOrders.count || 0);
      const completionRate = totalOrders > 0
        ? Math.round(((completedOrders.count || 0) / totalOrders) * 100)
        : 0;

      const avgResponse = allOrders.data?.reduce((acc, order) => {
        if (order.assigned_at) {
          const diff = new Date(order.assigned_at).getTime() - new Date(order.created_at).getTime();
          return acc + diff / (1000 * 60 * 60);
        }
        return acc;
      }, 0) || 0;

      const avgResponseTime = allOrders.data?.length
        ? Math.round(avgResponse / allOrders.data.length)
        : 0;

      setStats({
        activeWorkOrders: activeOrders.count || 0,
        completedWorkOrders: completedOrders.count || 0,
        overdueTasks: overdueTasks.count || 0,
        dailyReports: dailyReports.count || 0,
        totalAssets: assets.count || 0,
        lowStockItems: lowStock,
        completionRate,
        avgResponseTime,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Install PWA Banner */}
      {!isInstalled && showInstallBanner && (
          <Alert className="bg-primary/5 border-primary/20">
            <Download className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {language === 'ar' 
                    ? 'ثبّت التطبيق للوصول السريع' 
                    : 'Install app for quick access'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === 'ar' 
                    ? 'احصل على تجربة أفضل وإشعارات فورية' 
                    : 'Get better experience and instant notifications'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isInstallable ? (
                  <Button onClick={installPWA} size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    {language === 'ar' ? 'تثبيت' : 'Install'}
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/install')} size="sm" variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    {language === 'ar' ? 'تعليمات التثبيت' : 'Install Instructions'}
                  </Button>
                )}
                <Button 
                  onClick={() => setShowInstallBanner(false)} 
                  size="sm" 
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-info"
            onClick={() => navigate('/admin/work-orders')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'البلاغات اليومية' : 'Daily Reports'}
              </CardTitle>
              <ClipboardList className="h-5 w-5 text-info" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-3xl font-bold">{stats.dailyReports}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ar' ? 'اليوم' : 'Today'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-warning"
            onClick={() => navigate('/admin/work-orders?status=active')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'أوامر العمل النشطة' : 'Active Work Orders'}
              </CardTitle>
              <ClipboardList className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-3xl font-bold">{stats.activeWorkOrders}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-success" />
                    <p className="text-xs text-muted-foreground">
                      {stats.completionRate}% {language === 'ar' ? 'معدل الإنجاز' : 'completion'}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-success"
            onClick={() => navigate('/admin/assets')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'الأصول النشطة' : 'Active Assets'}
              </CardTitle>
              <Package className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-3xl font-bold">{stats.totalAssets}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ar' ? 'قيد التشغيل' : 'Operational'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-destructive"
            onClick={() => navigate('/admin/inventory')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'مخزون منخفض' : 'Low Stock Items'}
              </CardTitle>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-destructive">{stats.lowStockItems}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ar' ? 'يحتاج تعبئة' : 'Needs restocking'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WorkOrdersChart />
          <InventoryStatusChart />
        </div>

        {/* Performance & Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamPerformanceCard />
          <RecentAlertsCard />
        </div>

        {/* Quick Access Modules */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {language === 'ar' ? 'الوصول السريع' : 'Quick Access'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              className="hover:border-primary transition-colors cursor-pointer"
              onClick={() => navigate('/facilities')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5 text-primary" />
                  {language === 'ar' ? 'المرافق' : 'Facilities'}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card 
              className="hover:border-primary transition-colors cursor-pointer"
              onClick={() => navigate('/admin/assets')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-5 w-5 text-primary" />
                  {t('assets')}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card 
              className="hover:border-primary transition-colors cursor-pointer"
              onClick={() => navigate('/admin/work-orders')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  {t('workOrders')}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card 
              className="hover:border-primary transition-colors cursor-pointer"
              onClick={() => navigate('/maintenance')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  {t('maintenance')}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
    </div>
  );
}
