import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Cost {
  id: string;
  code: string;
  description: string;
  description_ar: string;
  cost_type: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  currency: string;
  cost_date: string;
  vendor: string | null;
  invoice_number: string | null;
}

interface CostStats {
  totalCosts: number;
  laborCosts: number;
  partsCosts: number;
  serviceCosts: number;
  monthlyChange: number;
}

export default function Costs() {
  const { language } = useLanguage();
  const { profile } = useCurrentUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [stats, setStats] = useState<CostStats>({
    totalCosts: 0,
    laborCosts: 0,
    partsCosts: 0,
    serviceCosts: 0,
    monthlyChange: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [profile?.hospital_id]);

  const loadData = async () => {
    if (!profile?.hospital_id) return;

    try {
      setLoading(true);

      // Load costs
      const { data: costsData, error: costsError } = await supabase
        .from('costs')
        .select('*')
        .eq('hospital_id', profile.hospital_id)
        .order('cost_date', { ascending: false })
        .limit(100);

      if (costsError) throw costsError;

      setCosts(costsData || []);

      // Calculate stats
      if (costsData) {
        const total = costsData.reduce((sum, cost) => sum + Number(cost.total_cost), 0);
        const labor = costsData.filter(c => c.cost_type === 'labor').reduce((sum, cost) => sum + Number(cost.total_cost), 0);
        const parts = costsData.filter(c => c.cost_type === 'parts').reduce((sum, cost) => sum + Number(cost.total_cost), 0);
        const service = costsData.filter(c => c.cost_type === 'service').reduce((sum, cost) => sum + Number(cost.total_cost), 0);

        // Calculate monthly change (compare current month to previous month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const currentMonthCosts = costsData.filter(c => {
          const date = new Date(c.cost_date);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).reduce((sum, cost) => sum + Number(cost.total_cost), 0);

        const previousMonthCosts = costsData.filter(c => {
          const date = new Date(c.cost_date);
          const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
        }).reduce((sum, cost) => sum + Number(cost.total_cost), 0);

        const change = previousMonthCosts > 0 
          ? ((currentMonthCosts - previousMonthCosts) / previousMonthCosts) * 100 
          : 0;

        setStats({
          totalCosts: total,
          laborCosts: labor,
          partsCosts: parts,
          serviceCosts: service,
          monthlyChange: change,
        });
      }
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCostTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      labor: { en: 'Labor', ar: 'عمالة' },
      parts: { en: 'Parts', ar: 'قطع غيار' },
      service: { en: 'Service', ar: 'خدمة' },
      travel: { en: 'Travel', ar: 'تنقل' },
      other: { en: 'Other', ar: 'أخرى' },
    };
    return language === 'ar' ? labels[type]?.ar || type : labels[type]?.en || type;
  };

  const filteredCosts = costs.filter(cost =>
    cost.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cost.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cost.description_ar.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8 text-muted-foreground">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'إدارة التكاليف' : 'Cost Management'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'تتبع وإدارة تكاليف الصيانة والعمالة' 
              : 'Track and manage maintenance and labor costs'}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'إضافة تكلفة' : 'Add Cost'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي التكاليف' : 'Total Costs'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalCosts.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
            </div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              {stats.monthlyChange >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              )}
              <span className={stats.monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(stats.monthlyChange).toFixed(1)}%
              </span>
              <span className="mx-1">{language === 'ar' ? 'عن الشهر الماضي' : 'vs last month'}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'تكاليف العمالة' : 'Labor Costs'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.laborCosts.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.laborCosts / stats.totalCosts) * 100).toFixed(1)}% {language === 'ar' ? 'من الإجمالي' : 'of total'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'تكاليف قطع الغيار' : 'Parts Costs'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.partsCosts.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.partsCosts / stats.totalCosts) * 100).toFixed(1)}% {language === 'ar' ? 'من الإجمالي' : 'of total'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'تكاليف الخدمات' : 'Service Costs'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.serviceCosts.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.serviceCosts / stats.totalCosts) * 100).toFixed(1)}% {language === 'ar' ? 'من الإجمالي' : 'of total'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Costs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{language === 'ar' ? 'سجل التكاليف' : 'Cost Records'}</CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'جميع التكاليف المسجلة في النظام' 
                  : 'All costs recorded in the system'}
              </CardDescription>
            </div>
            <Input
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'الرمز' : 'Code'}</TableHead>
                <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                <TableHead className="text-right">{language === 'ar' ? 'الكمية' : 'Quantity'}</TableHead>
                <TableHead className="text-right">{language === 'ar' ? 'سعر الوحدة' : 'Unit Cost'}</TableHead>
                <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead>{language === 'ar' ? 'المورد' : 'Vendor'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {language === 'ar' ? 'لا توجد تكاليف مسجلة' : 'No costs recorded'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell className="font-medium">{cost.code}</TableCell>
                    <TableCell>
                      {language === 'ar' ? cost.description_ar : cost.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getCostTypeLabel(cost.cost_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{cost.quantity}</TableCell>
                    <TableCell className="text-right">
                      {cost.unit_cost.toLocaleString()} {cost.currency}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {cost.total_cost.toLocaleString()} {cost.currency}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(cost.cost_date), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>{cost.vendor || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
