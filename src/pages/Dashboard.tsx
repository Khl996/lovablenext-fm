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

interface DashboardStats {
  totalAssets: number;
  activeWorkOrders: number;
  criticalAssets: number;
  completedToday: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { language, setLanguage, t, direction } = useLanguage();
  const { isInstalled, isInstallable, installPWA } = usePWAInstall();
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    activeWorkOrders: 0,
    criticalAssets: 0,
    completedToday: 0,
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

      // Load assets count
      const { count: assetsCount } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true });

      // Load active work orders count
      const { count: workOrdersCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'assigned', 'in_progress']);

      // Load critical assets count
      const { count: criticalCount } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('criticality', 'critical');

      // Load completed today count
      const today = new Date().toISOString().split('T')[0];
      const { count: completedCount } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('end_time', today);

      setStats({
        totalAssets: assetsCount || 0,
        activeWorkOrders: workOrdersCount || 0,
        criticalAssets: criticalCount || 0,
        completedToday: completedCount || 0,
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('totalAssets')}
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="text-2xl font-semibold">{stats.totalAssets}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('activeWorkOrders')}
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="text-2xl font-semibold">{stats.activeWorkOrders}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('criticalAssets')}
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="text-2xl font-semibold">{stats.criticalAssets}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('completedToday')}
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="text-2xl font-semibold">{stats.completedToday}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {language === 'ar' ? 'الوحدات' : 'Modules'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  {t('assets')}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-4 w-4" />
                  {t('workOrders')}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('maintenance')}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
    </div>
  );
}
