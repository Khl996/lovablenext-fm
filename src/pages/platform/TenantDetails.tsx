import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Ban, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge';
import { UsageIndicator } from '@/components/subscription/UsageIndicator';
import { toast } from '@/hooks/use-toast';
import { useTenantUsage } from '@/hooks/useTenantUsage';
import { useTenantSubscription } from '@/hooks/useTenantSubscription';

export default function TenantDetails() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);

  const { calculateUsage } = useTenantUsage(tenantId || '');
  const { updateSubscriptionStatus } = useTenantSubscription();

  useEffect(() => {
    if (tenantId) {
      fetchTenantDetails();
      fetchUsage();
    }
  }, [tenantId]);

  const fetchTenantDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          plan:plan_id(name, name_ar, price_monthly, price_yearly)
        `)
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      setTenant(data);
    } catch (error) {
      console.error('Error fetching tenant:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل تحميل المستأجر' : 'Failed to load tenant',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsage = async () => {
    const usageData = await calculateUsage();
    setUsage(usageData);
  };

  const handleSuspend = async () => {
    if (!tenantId) return;
    const success = await updateSubscriptionStatus(tenantId, 'suspended', 'Suspended by admin', 'current-user-id');
    if (success) {
      fetchTenantDetails();
    }
  };

  const handleActivate = async () => {
    if (!tenantId) return;
    const success = await updateSubscriptionStatus(tenantId, 'active', 'Activated by admin', 'current-user-id');
    if (success) {
      fetchTenantDetails();
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-gray-500">
          {language === 'ar' ? 'المستأجر غير موجود' : 'Tenant not found'}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/platform/tenants')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{tenant.name}</h1>
            <p className="text-gray-600">{tenant.slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {tenant.subscription_status === 'active' && (
            <Button variant="destructive" onClick={handleSuspend}>
              <Ban className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'تعليق' : 'Suspend'}
            </Button>
          )}
          {tenant.subscription_status === 'suspended' && (
            <Button onClick={handleActivate}>
              <CheckCircle className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'تفعيل' : 'Activate'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'معلومات الاشتراك' : 'Subscription Info'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">{language === 'ar' ? 'الحالة' : 'Status'}:</span>
              <SubscriptionBadge status={tenant.subscription_status} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{language === 'ar' ? 'الخطة' : 'Plan'}:</span>
              <span className="font-semibold">
                {tenant.plan ? (language === 'ar' ? tenant.plan.name_ar : tenant.plan.name) : '-'}
              </span>
            </div>
            {tenant.trial_ends_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">{language === 'ar' ? 'انتهاء التجربة' : 'Trial Ends'}:</span>
                <span>{new Date(tenant.trial_ends_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
              </div>
            )}
            {tenant.subscription_ends_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">{language === 'ar' ? 'انتهاء الاشتراك' : 'Subscription Ends'}:</span>
                <span>{new Date(tenant.subscription_ends_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'معلومات الاتصال' : 'Contact Info'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">{language === 'ar' ? 'البريد' : 'Email'}:</span>
              <span>{tenant.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{language === 'ar' ? 'الهاتف' : 'Phone'}:</span>
              <span>{tenant.phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{language === 'ar' ? 'العنوان' : 'Address'}:</span>
              <span>{tenant.address || '-'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {usage && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{language === 'ar' ? 'الاستخدام الحالي' : 'Current Usage'}</CardTitle>
              <Button variant="outline" size="sm" onClick={fetchUsage}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageIndicator
              label={language === 'ar' ? 'المستخدمون' : 'Users'}
              current={usage.users_count}
              max={tenant.max_users}
            />
            <UsageIndicator
              label={language === 'ar' ? 'الأصول' : 'Assets'}
              current={usage.assets_count}
              max={tenant.max_assets}
            />
            <UsageIndicator
              label={language === 'ar' ? 'أوامر العمل (هذا الشهر)' : 'Work Orders (This Month)'}
              current={usage.work_orders_this_month}
              max={tenant.max_work_orders_per_month}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
