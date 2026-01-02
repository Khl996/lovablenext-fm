import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, DollarSign, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalUsers: number;
  expiringS oon: number;
}

export default function PlatformDashboard() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats>({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    suspendedTenants: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalUsers: 0,
    expiringSoon: 0
  });
  const [recentTenants, setRecentTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [tenantsResult, invoicesResult, profilesResult] = await Promise.all([
        supabase.from('tenants').select('*'),
        supabase.from('invoices').select('total, status'),
        supabase.from('profiles').select('id')
      ]);

      const tenants = tenantsResult.data || [];
      const invoices = invoicesResult.data || [];

      const totalTenants = tenants.length;
      const activeTenants = tenants.filter(t => t.subscription_status === 'active').length;
      const trialTenants = tenants.filter(t => t.subscription_status === 'trial').length;
      const suspendedTenants = tenants.filter(t => t.subscription_status === 'suspended').length;

      const totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

      const currentMonth = new Date().getMonth();
      const monthlyRevenue = invoices
        .filter(inv => {
          if (inv.status !== 'paid') return false;
          return true;
        })
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const expiringSoon = tenants.filter(t => {
        if (t.subscription_status === 'trial' && t.trial_ends_at) {
          return new Date(t.trial_ends_at) <= sevenDaysFromNow;
        }
        if (t.subscription_status === 'active' && t.subscription_ends_at) {
          return new Date(t.subscription_ends_at) <= sevenDaysFromNow;
        }
        return false;
      }).length;

      setStats({
        totalTenants,
        activeTenants,
        trialTenants,
        suspendedTenants,
        totalRevenue,
        monthlyRevenue,
        totalUsers: profilesResult.data?.length || 0,
        expiringSoon
      });

      setRecentTenants(tenants.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const statCards = [
    {
      title: language === 'ar' ? 'إجمالي المستأجرين' : 'Total Tenants',
      value: stats.totalTenants,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: language === 'ar' ? 'المستأجرون النشطون' : 'Active Tenants',
      value: stats.activeTenants,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: language === 'ar' ? 'فترة تجريبية' : 'Trial Period',
      value: stats.trialTenants,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: language === 'ar' ? 'معلق' : 'Suspended',
      value: stats.suspendedTenants,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: language === 'ar' ? 'الإيرادات الكلية' : 'Total Revenue',
      value: `${stats.totalRevenue.toLocaleString()} ${language === 'ar' ? 'ر.س' : 'SAR'}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: language === 'ar' ? 'ينتهي قريباً' : 'Expiring Soon',
      value: stats.expiringSoon,
      icon: TrendingUp,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {language === 'ar' ? 'لوحة تحكم المنصة' : 'Platform Dashboard'}
        </h1>
        <p className="text-gray-600">
          {language === 'ar'
            ? 'نظرة عامة على جميع المستأجرين والاشتراكات'
            : 'Overview of all tenants and subscriptions'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'المستأجرون الجدد' : 'Recent Tenants'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTenants.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
            </p>
          ) : (
            <div className="space-y-4">
              {recentTenants.map(tenant => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/platform/tenants/${tenant.id}`)}
                >
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{tenant.name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(tenant.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SubscriptionBadge status={tenant.subscription_status} />
                    {tenant.subscription_status === 'trial' && tenant.trial_ends_at && (
                      <Badge variant="outline" className="text-xs">
                        {Math.ceil((new Date(tenant.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} {language === 'ar' ? 'يوم' : 'days'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
