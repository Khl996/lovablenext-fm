import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTenantSubscription } from '@/hooks/useTenantSubscription';
import { useTenantUsage } from '@/hooks/useTenantUsage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge';
import { UsageIndicator } from '@/components/subscription/UsageIndicator';
import { Crown, Users, Package, Database, FileText } from 'lucide-react';

export default function MySubscription() {
  const { language } = useLanguage();
  const { profile } = useCurrentUser();
  const { subscription } = useTenantSubscription(profile?.tenant_id || '');
  const { usage } = useTenantUsage(profile?.tenant_id || '');

  if (!profile?.tenant_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {language === 'ar' ? 'لم يتم العثور على معلومات المستأجر' : 'Tenant information not found'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {language === 'ar' ? 'اشتراكي' : 'My Subscription'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {language === 'ar' ? 'إدارة خطة الاشتراك والاستخدام' : 'Manage your subscription and usage'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              {language === 'ar' ? 'الخطة الحالية' : 'Current Plan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscription && <SubscriptionBadge status={subscription.subscription_status} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'الاستخدام' : 'Usage'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <Users className="h-4 w-4" />
                  {language === 'ar' ? 'المستخدمين' : 'Users'}
                </div>
                <UsageIndicator
                  used={usage?.users || 0}
                  limit={subscription?.max_users || null}
                  label=""
                />
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <Package className="h-4 w-4" />
                  {language === 'ar' ? 'الأصول' : 'Assets'}
                </div>
                <UsageIndicator
                  used={usage?.assets || 0}
                  limit={subscription?.max_assets || null}
                  label=""
                />
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <FileText className="h-4 w-4" />
                  {language === 'ar' ? 'أوامر العمل' : 'Work Orders'}
                </div>
                <UsageIndicator
                  used={usage?.work_orders_this_month || 0}
                  limit={subscription?.max_work_orders_per_month || null}
                  label=""
                />
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <Database className="h-4 w-4" />
                  {language === 'ar' ? 'التخزين' : 'Storage'}
                </div>
                <UsageIndicator
                  used={usage?.storage_mb || 0}
                  limit={subscription?.max_storage_mb || null}
                  label=""
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
