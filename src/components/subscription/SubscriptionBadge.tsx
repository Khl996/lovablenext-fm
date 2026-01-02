import { Badge } from '@/components/ui/badge';
import { SubscriptionStatus } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface SubscriptionBadgeProps {
  status: SubscriptionStatus;
  className?: string;
}

export const SubscriptionBadge = ({ status, className }: SubscriptionBadgeProps) => {
  const { language } = useLanguage();

  const statusConfig: Record<SubscriptionStatus, { label: { en: string; ar: string }; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    trial: {
      label: { en: 'Trial', ar: 'تجريبي' },
      variant: 'secondary'
    },
    active: {
      label: { en: 'Active', ar: 'نشط' },
      variant: 'default'
    },
    suspended: {
      label: { en: 'Suspended', ar: 'معلق' },
      variant: 'destructive'
    },
    cancelled: {
      label: { en: 'Cancelled', ar: 'ملغي' },
      variant: 'outline'
    },
    expired: {
      label: { en: 'Expired', ar: 'منتهي' },
      variant: 'destructive'
    }
  };

  const config = statusConfig[status] || statusConfig.trial;

  return (
    <Badge variant={config.variant} className={className}>
      {language === 'ar' ? config.label.ar : config.label.en}
    </Badge>
  );
};
