import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SLADefinition {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  priority: string;
  response_time_hours: number;
  resolution_time_hours: number;
  availability_target: number | null;
  is_active: boolean;
}

interface SLABreach {
  id: string;
  breach_type: string;
  expected_time: string;
  actual_time: string | null;
  breach_duration_minutes: number | null;
  status: string;
  work_order_id: string | null;
}

interface SLAStats {
  totalDefinitions: number;
  activeBreaches: number;
  resolvedBreaches: number;
  complianceRate: number;
}

export default function SLA() {
  const { language } = useLanguage();
  const { profile } = useCurrentUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [definitions, setDefinitions] = useState<SLADefinition[]>([]);
  const [breaches, setBreaches] = useState<SLABreach[]>([]);
  const [stats, setStats] = useState<SLAStats>({
    totalDefinitions: 0,
    activeBreaches: 0,
    resolvedBreaches: 0,
    complianceRate: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [profile?.hospital_id]);

  const loadData = async () => {
    if (!profile?.hospital_id) return;

    try {
      setLoading(true);

      // Load SLA definitions
      const { data: defsData, error: defsError } = await supabase
        .from('sla_definitions')
        .select('*')
        .eq('hospital_id', profile.hospital_id)
        .order('priority', { ascending: true });

      if (defsError) throw defsError;

      // Load SLA breaches
      const { data: breachesData, error: breachesError } = await supabase
        .from('sla_breaches')
        .select('*')
        .eq('hospital_id', profile.hospital_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (breachesError) throw breachesError;

      setDefinitions(defsData || []);
      setBreaches(breachesData || []);

      // Calculate stats
      if (defsData && breachesData) {
        const activeBreaches = breachesData.filter(b => b.status === 'open').length;
        const resolvedBreaches = breachesData.filter(b => b.status === 'resolved').length;
        const totalBreaches = breachesData.length;
        const complianceRate = totalBreaches > 0 
          ? ((totalBreaches - activeBreaches) / totalBreaches) * 100 
          : 100;

        setStats({
          totalDefinitions: defsData.length,
          activeBreaches,
          resolvedBreaches,
          complianceRate,
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

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { label: { en: string; ar: string }; variant: any }> = {
      critical: { label: { en: 'Critical', ar: 'حرج' }, variant: 'destructive' },
      high: { label: { en: 'High', ar: 'عالي' }, variant: 'destructive' },
      medium: { label: { en: 'Medium', ar: 'متوسط' }, variant: 'default' },
      low: { label: { en: 'Low', ar: 'منخفض' }, variant: 'secondary' },
    };

    const priorityConfig = config[priority] || config.medium;
    return (
      <Badge variant={priorityConfig.variant}>
        {language === 'ar' ? priorityConfig.label.ar : priorityConfig.label.en}
      </Badge>
    );
  };

  const getBreachStatusBadge = (status: string) => {
    const config: Record<string, { label: { en: string; ar: string }; variant: any }> = {
      open: { label: { en: 'Open', ar: 'مفتوح' }, variant: 'destructive' },
      acknowledged: { label: { en: 'Acknowledged', ar: 'مقر به' }, variant: 'default' },
      resolved: { label: { en: 'Resolved', ar: 'محلول' }, variant: 'secondary' },
      waived: { label: { en: 'Waived', ar: 'معفى' }, variant: 'outline' },
    };

    const statusConfig = config[status] || config.open;
    return (
      <Badge variant={statusConfig.variant}>
        {language === 'ar' ? statusConfig.label.ar : statusConfig.label.en}
      </Badge>
    );
  };

  const getBreachTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      response_time: { en: 'Response Time', ar: 'وقت الاستجابة' },
      resolution_time: { en: 'Resolution Time', ar: 'وقت الحل' },
      availability: { en: 'Availability', ar: 'التوفر' },
    };
    return language === 'ar' ? labels[type]?.ar || type : labels[type]?.en || type;
  };

  const filteredDefinitions = definitions.filter(def =>
    def.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    def.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    def.name_ar.includes(searchTerm)
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
            {language === 'ar' ? 'اتفاقيات مستوى الخدمة (SLA)' : 'Service Level Agreements (SLA)'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'إدارة ومراقبة اتفاقيات مستوى الخدمة' 
              : 'Manage and monitor service level agreements'}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'إضافة SLA' : 'Add SLA'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي الاتفاقيات' : 'Total SLAs'}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDefinitions}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'اتفاقية نشطة' : 'active agreements'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'الانتهاكات النشطة' : 'Active Breaches'}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBreaches}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'يحتاج معالجة' : 'needs attention'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'الانتهاكات المحلولة' : 'Resolved Breaches'}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolvedBreaches}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'تم حلها' : 'resolved'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'معدل الالتزام' : 'Compliance Rate'}
            </CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complianceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'نسبة الالتزام بالاتفاقيات' : 'SLA compliance rate'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Definitions and Breaches */}
      <Tabs defaultValue="definitions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="definitions">
            {language === 'ar' ? 'التعريفات' : 'Definitions'}
          </TabsTrigger>
          <TabsTrigger value="breaches">
            {language === 'ar' ? 'الانتهاكات' : 'Breaches'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="definitions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{language === 'ar' ? 'تعريفات SLA' : 'SLA Definitions'}</CardTitle>
                  <CardDescription>
                    {language === 'ar' 
                      ? 'معايير وأهداف مستوى الخدمة' 
                      : 'Service level standards and targets'}
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
                    <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الأولوية' : 'Priority'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'وقت الاستجابة' : 'Response Time'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'وقت الحل' : 'Resolution Time'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'هدف التوفر' : 'Availability Target'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDefinitions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === 'ar' ? 'لا توجد تعريفات SLA' : 'No SLA definitions found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDefinitions.map((def) => (
                      <TableRow key={def.id}>
                        <TableCell className="font-medium">{def.code}</TableCell>
                        <TableCell>
                          {language === 'ar' ? def.name_ar : def.name}
                        </TableCell>
                        <TableCell>{getPriorityBadge(def.priority)}</TableCell>
                        <TableCell className="text-right">
                          {def.response_time_hours} {language === 'ar' ? 'ساعة' : 'hrs'}
                        </TableCell>
                        <TableCell className="text-right">
                          {def.resolution_time_hours} {language === 'ar' ? 'ساعة' : 'hrs'}
                        </TableCell>
                        <TableCell className="text-right">
                          {def.availability_target ? `${def.availability_target}%` : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={def.is_active ? 'default' : 'secondary'}>
                            {def.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breaches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'انتهاكات SLA' : 'SLA Breaches'}</CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'سجل انتهاكات اتفاقيات مستوى الخدمة' 
                  : 'Record of service level agreement violations'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'نوع الانتهاك' : 'Breach Type'}</TableHead>
                    <TableHead>{language === 'ar' ? 'مدة الانتهاك' : 'Duration'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{language === 'ar' ? 'أمر العمل' : 'Work Order'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breaches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {language === 'ar' ? 'لا توجد انتهاكات مسجلة' : 'No breaches recorded'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    breaches.map((breach) => (
                      <TableRow key={breach.id}>
                        <TableCell>
                          <Badge variant="outline">{getBreachTypeLabel(breach.breach_type)}</Badge>
                        </TableCell>
                        <TableCell>
                          {breach.breach_duration_minutes 
                            ? `${Math.round(breach.breach_duration_minutes / 60)} ${language === 'ar' ? 'ساعة' : 'hrs'}`
                            : '-'}
                        </TableCell>
                        <TableCell>{getBreachStatusBadge(breach.status)}</TableCell>
                        <TableCell>
                          {breach.work_order_id || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
