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
  Globe,
  LogOut,
  Download,
  X
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { NotificationPromptBanner } from '@/components/NotificationPromptBanner';

interface DashboardStats {
  totalAssets: number;
  activeWorkOrders: number;
  completedWorkOrders: number;
  overdueTasks: number;
  dailyReports: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { language, setLanguage, t, direction } = useLanguage();
  const { isInstalled, isInstallable, installPWA } = usePWAInstall();
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    activeWorkOrders: 0,
    completedWorkOrders: 0,
    overdueTasks: 0,
    dailyReports: 0,
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

      // Load daily reports count (work orders reported today)
      const today = new Date().toISOString().split('T')[0];
      const { count: dailyReportsCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .gte('reported_at', today);

      // Load active work orders count
      const { count: workOrdersCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'assigned', 'in_progress']);

      // Load completed work orders count
      const { count: completedCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Load overdue tasks count (maintenance tasks past due date)
      const now = new Date().toISOString();
      const { count: overdueCount } = await supabase
        .from('maintenance_tasks')
        .select('*', { count: 'exact', head: true })
        .lt('end_date', now)
        .neq('status', 'completed');

      setStats({
        totalAssets: 0,
        activeWorkOrders: workOrdersCount || 0,
        completedWorkOrders: completedCount || 0,
        overdueTasks: overdueCount || 0,
        dailyReports: dailyReportsCount || 0,
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
      {/* Notification Prompt Banner */}
      <NotificationPromptBanner />

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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-blue-500"
            onClick={() => navigate('/admin/work-orders')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'البلاغات اليومية' : 'Daily Reports'}
              </CardTitle>
              <ClipboardList className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="text-3xl font-bold">{stats.dailyReports}</div>
              )}
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-orange-500"
            onClick={() => navigate('/admin/work-orders?status=active')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'أوامر العمل النشطة' : 'Active Work Orders'}
              </CardTitle>
              <ClipboardList className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="text-3xl font-bold">{stats.activeWorkOrders}</div>
              )}
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-green-500"
            onClick={() => navigate('/admin/work-orders?status=completed')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'أوامر العمل المنتهية' : 'Completed Work Orders'}
              </CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="text-3xl font-bold">{stats.completedWorkOrders}</div>
              )}
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-red-500"
            onClick={() => navigate('/maintenance')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'المهام المتأخرة' : 'Overdue Tasks'}
              </CardTitle>
              <Package className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="text-3xl font-bold text-red-500">{stats.overdueTasks}</div>
              )}
            </CardContent>
          </Card>
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
