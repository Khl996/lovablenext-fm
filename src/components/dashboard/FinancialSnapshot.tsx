import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';

export function FinancialSnapshot() {
  const { language } = useLanguage();
  const [totalCosts, setTotalCosts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonthlyCosts();
  }, []);

  const loadMonthlyCosts = async () => {
    try {
      setLoading(true);

      // Get current month start and end dates
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      // Fetch costs for current month
      const { data: costs, error } = await supabase
        .from('costs')
        .select('total_cost, unit_cost, quantity')
        .gte('cost_date', startOfMonth.split('T')[0])
        .lte('cost_date', endOfMonth.split('T')[0]);

      if (error) throw error;

      // Calculate total costs
      const total = costs?.reduce((sum, cost) => {
        const costValue = cost.total_cost || (cost.unit_cost * (cost.quantity || 1));
        return sum + (costValue || 0);
      }, 0) || 0;

      setTotalCosts(total);
    } catch (error) {
      console.error('Error loading monthly costs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCurrentMonth = () => {
    const now = new Date();
    const monthNames = language === 'ar' 
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          {language === 'ar' ? 'نظرة مالية' : 'Financial Snapshot'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-12 bg-muted animate-pulse rounded"></div>
            <div className="h-8 bg-muted animate-pulse rounded"></div>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                <Calendar className="h-4 w-4" />
                {language === 'ar' ? 'تكاليف الصيانة المقدرة' : 'Estimated Maintenance Costs'}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">
                  {formatCurrency(totalCosts)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {getCurrentMonth()}
              </p>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-success" />
                <span>
                  {language === 'ar' 
                    ? 'يشمل تكاليف قطع الغيار والعمالة' 
                    : 'Includes parts and labor costs'}
                </span>
              </div>
            </div>

            {totalCosts === 0 && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'لا توجد تكاليف مسجلة لهذا الشهر' 
                  : 'No costs recorded for this month'}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
