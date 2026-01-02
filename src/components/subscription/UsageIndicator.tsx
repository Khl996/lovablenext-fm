import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface UsageIndicatorProps {
  label: string;
  current: number;
  max: number | null;
  unit?: string;
  showPercentage?: boolean;
  className?: string;
}

export const UsageIndicator = ({
  label,
  current,
  max,
  unit = '',
  showPercentage = true,
  className
}: UsageIndicatorProps) => {
  const { language } = useLanguage();

  const percentage = max ? Math.min((current / max) * 100, 100) : 0;
  const isUnlimited = max === null;
  const isNearLimit = percentage > 80;
  const isOverLimit = percentage >= 100;

  const getColor = () => {
    if (isOverLimit) return 'text-red-600';
    if (isNearLimit) return 'text-orange-600';
    return 'text-gray-600';
  };

  const getProgressColor = () => {
    if (isOverLimit) return '[&>div]:bg-red-500';
    if (isNearLimit) return '[&>div]:bg-orange-500';
    return '[&>div]:bg-blue-500';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn('font-semibold', getColor())}>
          {current}{unit} {!isUnlimited && `/ ${max}${unit}`}
          {isUnlimited && (
            <span className="text-xs text-gray-500 mr-1">
              {language === 'ar' ? '(غير محدود)' : '(Unlimited)'}
            </span>
          )}
        </span>
      </div>

      {!isUnlimited && (
        <>
          <Progress
            value={percentage}
            className={cn('h-2', getProgressColor())}
          />
          {showPercentage && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {language === 'ar' ? 'مستخدم' : 'Used'}: {percentage.toFixed(1)}%
              </span>
              {!isOverLimit && (
                <span>
                  {language === 'ar' ? 'متبقي' : 'Remaining'}: {max - current}{unit}
                </span>
              )}
              {isOverLimit && (
                <span className="text-red-600 font-medium">
                  {language === 'ar' ? 'تجاوز الحد!' : 'Over limit!'}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
