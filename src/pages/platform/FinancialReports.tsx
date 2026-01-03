import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Users, CreditCard, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface TenantRevenue {
  tenant_name: string;
  revenue: number;
  status: string;
}

interface FinancialMetrics {
  mrr: number;
  arr: number;
  churn_rate: number;
  average_revenue_per_tenant: number;
  total_active_tenants: number;
  total_revenue_this_month: number;
  total_revenue_last_month: number;
  growth_rate: number;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function FinancialReports() {
  const { language } = useLanguage();
  const [timeRange, setTimeRange] = useState('6months');

  const { data: metrics } = useQuery({
    queryKey: ['financial-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_financial_metrics');
      if (error) throw error;
      return data as FinancialMetrics;
    },
  });

  const { data: revenueData } = useQuery({
    queryKey: ['revenue-trend', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_revenue_trend', {
        time_range: timeRange
      });
      if (error) throw error;
      return data as RevenueData[];
    },
  });

  const { data: tenantRevenue } = useQuery({
    queryKey: ['tenant-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tenant_revenue_breakdown');
      if (error) throw error;
      return data as TenantRevenue[];
    },
  });

  const { data: overdueInvoices } = useQuery({
    queryKey: ['overdue-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          tenant:hospitals(name, name_ar)
        `)
        .eq('status', 'overdue')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'التقارير المالية' : 'Financial Reports'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'تحليل الإيرادات والأداء المالي للمنصة' : 'Revenue analysis and platform financial performance'}
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3months">{language === 'ar' ? '3 أشهر' : '3 Months'}</SelectItem>
            <SelectItem value="6months">{language === 'ar' ? '6 أشهر' : '6 Months'}</SelectItem>
            <SelectItem value="12months">{language === 'ar' ? '12 شهر' : '12 Months'}</SelectItem>
            <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All Time'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'الإيرادات الشهرية المتكررة' : 'Monthly Recurring Revenue'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.mrr || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'السنوية' : 'ARR'}: {formatCurrency(metrics?.arr || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'معدل النمو' : 'Growth Rate'}
            </CardTitle>
            {(metrics?.growth_rate || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics?.growth_rate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'مقارنة بالشهر الماضي' : 'vs last month'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'المستأجرون النشطون' : 'Active Tenants'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_active_tenants || 0}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'متوسط الإيراد' : 'Avg Revenue'}: {formatCurrency(metrics?.average_revenue_per_tenant || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'معدل التوقف' : 'Churn Rate'}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics?.churn_rate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'آخر 30 يوم' : 'Last 30 days'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">
            {language === 'ar' ? 'الإيرادات' : 'Revenue'}
          </TabsTrigger>
          <TabsTrigger value="tenants">
            {language === 'ar' ? 'المستأجرون' : 'Tenants'}
          </TabsTrigger>
          <TabsTrigger value="overdue">
            {language === 'ar' ? 'الفواتير المتأخرة' : 'Overdue'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'اتجاه الإيرادات' : 'Revenue Trend'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'الإيرادات والنفقات والأرباح' : 'Revenue, expenses, and profit over time'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    name={language === 'ar' ? 'الإيرادات' : 'Revenue'}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    name={language === 'ar' ? 'النفقات' : 'Expenses'}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#10b981"
                    name={language === 'ar' ? 'الأرباح' : 'Profit'}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'توزيع الإيرادات حسب المستأجر' : 'Revenue by Tenant'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tenantRevenue?.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.tenant_name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {tenantRevenue?.slice(0, 5).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'أعلى 10 مستأجرين' : 'Top 10 Tenants'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tenantRevenue?.slice(0, 10).map((tenant, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{index + 1}.</div>
                        <div>
                          <div className="text-sm font-medium">{tenant.tenant_name}</div>
                          <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                            {tenant.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm font-bold">{formatCurrency(tenant.revenue)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {language === 'ar' ? 'الفواتير المتأخرة' : 'Overdue Invoices'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'الفواتير التي تجاوزت تاريخ الاستحقاق' : 'Invoices past their due date'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overdueInvoices?.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between border-b pb-4">
                    <div>
                      <div className="font-medium">
                        {language === 'ar' ? invoice.tenant?.name_ar : invoice.tenant?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'رقم الفاتورة' : 'Invoice'}: {invoice.invoice_number}
                      </div>
                      <div className="text-xs text-red-600">
                        {language === 'ar' ? 'متأخر منذ' : 'Overdue since'}: {' '}
                        {formatDistanceToNow(new Date(invoice.due_date), {
                          addSuffix: true,
                          locale: language === 'ar' ? ar : undefined,
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{formatCurrency(invoice.total)}</div>
                      <Badge variant="destructive">
                        {language === 'ar' ? 'متأخر' : 'Overdue'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!overdueInvoices || overdueInvoices.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    {language === 'ar' ? 'لا توجد فواتير متأخرة' : 'No overdue invoices'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
