import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import { SubscriptionPlan } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface PlanCardProps {
  plan: SubscriptionPlan;
  currentPlanId?: string;
  onSelect?: (planId: string) => void;
  billingCycle?: 'monthly' | 'yearly';
  showFeatures?: boolean;
  className?: string;
}

export const PlanCard = ({
  plan,
  currentPlanId,
  onSelect,
  billingCycle = 'monthly',
  showFeatures = true,
  className
}: PlanCardProps) => {
  const { language } = useLanguage();

  const isCurrentPlan = currentPlanId === plan.id;
  const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  const pricePerMonth = billingCycle === 'yearly' ? price / 12 : price;

  const formatNumber = (num: number | null) => {
    if (num === null) return language === 'ar' ? 'غير محدود' : 'Unlimited';
    return num.toLocaleString();
  };

  return (
    <Card
      className={cn(
        'relative',
        plan.is_featured && 'border-blue-500 shadow-lg',
        isCurrentPlan && 'ring-2 ring-blue-500',
        className
      )}
    >
      {plan.is_featured && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-500 text-white">
            <Star className="w-3 h-3 mr-1" />
            {language === 'ar' ? 'موصى به' : 'Recommended'}
          </Badge>
        </div>
      )}

      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">
              {language === 'ar' ? plan.name_ar : plan.name}
            </CardTitle>
            <CardDescription className="mt-2">
              {language === 'ar' ? plan.description_ar : plan.description}
            </CardDescription>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline">
            <span className="text-4xl font-bold">
              {price === 0 ? (
                language === 'ar' ? 'مجاني' : 'Free'
              ) : (
                <>
                  {price.toLocaleString()}
                  <span className="text-xl font-normal text-gray-500 mr-1">
                    {language === 'ar' ? 'ر.س' : 'SAR'}
                  </span>
                </>
              )}
            </span>
            {price > 0 && (
              <span className="text-sm text-gray-500 mr-2">
                / {billingCycle === 'monthly'
                  ? (language === 'ar' ? 'شهر' : 'month')
                  : (language === 'ar' ? 'سنة' : 'year')
                }
              </span>
            )}
          </div>
          {billingCycle === 'yearly' && price > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {language === 'ar'
                ? `${pricePerMonth.toFixed(0)} ر.س شهرياً`
                : `${pricePerMonth.toFixed(0)} SAR/month`
              }
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center text-sm">
            <Check className="w-4 h-4 text-green-500 mr-2" />
            <span>
              {formatNumber(plan.included_users)} {language === 'ar' ? 'مستخدم' : 'users'}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <Check className="w-4 h-4 text-green-500 mr-2" />
            <span>
              {formatNumber(plan.included_assets)} {language === 'ar' ? 'أصل' : 'assets'}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <Check className="w-4 h-4 text-green-500 mr-2" />
            <span>
              {formatNumber(plan.included_work_orders)} {language === 'ar' ? 'أمر عمل/شهر' : 'work orders/month'}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <Check className="w-4 h-4 text-green-500 mr-2" />
            <span>
              {plan.included_storage_mb
                ? `${(plan.included_storage_mb / 1024).toFixed(0)} GB ${language === 'ar' ? 'تخزين' : 'storage'}`
                : (language === 'ar' ? 'تخزين غير محدود' : 'Unlimited storage')
              }
            </span>
          </div>

          {showFeatures && plan.features && plan.features.length > 0 && (
            <>
              <div className="border-t pt-3 mt-3">
                <p className="text-sm font-semibold mb-2">
                  {language === 'ar' ? 'الميزات:' : 'Features:'}
                </p>
                <div className="space-y-2">
                  {plan.features.slice(0, 5).map((feature, index) => (
                    <div key={index} className="flex items-start text-sm">
                      <Check className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>

      <CardFooter>
        {isCurrentPlan ? (
          <Button variant="outline" className="w-full" disabled>
            {language === 'ar' ? 'الخطة الحالية' : 'Current Plan'}
          </Button>
        ) : onSelect ? (
          <Button
            className="w-full"
            onClick={() => onSelect(plan.id)}
            variant={plan.is_featured ? 'default' : 'outline'}
          >
            {language === 'ar' ? 'اختر هذه الخطة' : 'Select Plan'}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
};
