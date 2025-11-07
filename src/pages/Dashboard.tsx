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
  AlertTriangle, 
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

  const statCards = [
    {
      title: t('totalAssets'),
      value: stats.totalAssets,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: t('activeWorkOrders'),
      value: stats.activeWorkOrders,
      icon: ClipboardList,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: t('criticalAssets'),
      value: stats.criticalAssets,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: t('completedToday'),
      value: stats.completedToday,
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {language === 'ar' ? 'نظام إدارة المرافق' : 'Facility Management System'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('welcome')}, {user.user_metadata?.full_name || user.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                className="gap-2"
              >
                <Globe className="h-4 w-4" />
                {language === 'ar' ? 'English' : 'العربية'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Message */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">
              {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {language === 'ar' 
                ? 'مرحباً بك في نظام إدارة المرافق الشامل. تتبع الأصول وأوامر العمل وإدارة الصيانة بكفاءة.' 
                : 'Welcome to the comprehensive Facility Management System. Track assets, work orders, and manage maintenance efficiently.'}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <div className={`${card.bgColor} p-2 rounded-lg`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <div className="h-10 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <div className="text-3xl font-bold">{card.value}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="h-auto py-6 flex-col gap-2" disabled>
                  <Package className="h-6 w-6" />
                  <span>{language === 'ar' ? 'إدارة الأصول' : 'Manage Assets'}</span>
                  <span className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'قريباً' : 'Coming Soon'}
                  </span>
                </Button>
                
                <Button variant="outline" className="h-auto py-6 flex-col gap-2" disabled>
                  <ClipboardList className="h-6 w-6" />
                  <span>{language === 'ar' ? 'أوامر العمل' : 'Work Orders'}</span>
                  <span className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'قريباً' : 'Coming Soon'}
                  </span>
                </Button>
                
                <Button variant="outline" className="h-auto py-6 flex-col gap-2" disabled>
                  <Building2 className="h-6 w-6" />
                  <span>{language === 'ar' ? 'المرافق' : 'Facilities'}</span>
                  <span className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'قريباً' : 'Coming Soon'}
                  </span>
                </Button>
                
                <Button variant="outline" className="h-auto py-6 flex-col gap-2" disabled>
                  <CheckCircle2 className="h-6 w-6" />
                  <span>{language === 'ar' ? 'التقارير' : 'Reports'}</span>
                  <span className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'قريباً' : 'Coming Soon'}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Message */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="font-medium">
                  {language === 'ar' 
                    ? '🚀 النظام جاهز للاستخدام!' 
                    : '🚀 System Ready!'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' 
                    ? 'قاعدة البيانات تم إنشاؤها بنجاح. يمكنك الآن البدء في إضافة المستشفيات والأصول وأوامر العمل.' 
                    : 'Database created successfully. You can now start adding hospitals, assets, and work orders.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
