import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, 
  Package, 
  ClipboardList, 
  CheckCircle2, 
  Globe,
  LogOut 
} from 'lucide-react';

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
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    activeWorkOrders: 0,
    criticalAssets: 0,
    completedToday: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/5 p-2 rounded-lg border border-border">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold">{t('dashboard')}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              {language === 'ar' ? 'EN' : 'ع'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
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
      </main>
    </div>
  );
}
