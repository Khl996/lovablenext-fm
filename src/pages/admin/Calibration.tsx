import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Calendar, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CalibrationSchedule {
  id: string;
  code: string;
  asset_id: string;
  frequency_months: number;
  last_calibration_date: string | null;
  next_calibration_date: string;
  status: string;
  priority: string;
}

interface CalibrationRecord {
  id: string;
  code: string;
  asset_id: string;
  calibration_date: string;
  performed_by: string;
  result: string;
  certificate_number: string | null;
  cost: number | null;
}

interface CalibrationStats {
  totalSchedules: number;
  overdueCalibrations: number;
  upcomingCalibrations: number;
  completedThisMonth: number;
}

export default function Calibration() {
  const { language } = useLanguage();
  const { profile, permissions, loading: userLoading, hospitalId } = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<CalibrationSchedule[]>([]);
  const [records, setRecords] = useState<CalibrationRecord[]>([]);
  const [stats, setStats] = useState<CalibrationStats>({
    totalSchedules: 0,
    overdueCalibrations: 0,
    upcomingCalibrations: 0,
    completedThisMonth: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    asset_id: '',
    frequency_months: 12,
    priority: 'medium',
    next_calibration_date: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSaveSchedule = async () => {
    if (!profile?.hospital_id || !formData.code || !formData.next_calibration_date) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('calibration_schedules')
        .insert({
          hospital_id: profile.hospital_id,
          code: formData.code,
          asset_id: formData.asset_id || schedules[0]?.asset_id,
          frequency_months: formData.frequency_months,
          priority: formData.priority,
          next_calibration_date: formData.next_calibration_date,
          status: 'scheduled',
        });

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم إضافة جدول المعايرة بنجاح' : 'Calibration schedule added successfully',
      });

      setDialogOpen(false);
      setFormData({
        code: '',
        asset_id: '',
        frequency_months: 12,
        priority: 'medium',
        next_calibration_date: '',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const canView = permissions.hasPermission('calibration.view', hospitalId);
  const canManage = permissions.hasPermission('calibration.manage', hospitalId);

  useEffect(() => {
    if (!userLoading && !canView) {
      toast({
        title: language === 'ar' ? 'غير مصرح' : 'Unauthorized',
        description: language === 'ar' ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة' : 'You do not have permission to access this page',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [userLoading, canView, navigate]);

  useEffect(() => {
    loadData();
  }, [profile?.hospital_id]);

  const loadData = async () => {
    if (!profile?.hospital_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load calibration schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('calibration_schedules')
        .select('*')
        .eq('hospital_id', profile.hospital_id)
        .order('next_calibration_date', { ascending: true });

      if (schedulesError) throw schedulesError;

      // Load calibration records
      const { data: recordsData, error: recordsError } = await supabase
        .from('calibration_records')
        .select('*')
        .eq('hospital_id', profile.hospital_id)
        .order('calibration_date', { ascending: false })
        .limit(50);

      if (recordsError) throw recordsError;

      setSchedules(schedulesData || []);
      setRecords(recordsData || []);

      // Calculate stats
      if (schedulesData && recordsData) {
        const now = new Date();
        const overdue = schedulesData.filter(s => 
          new Date(s.next_calibration_date) < now && s.status !== 'completed'
        ).length;

        const upcoming = schedulesData.filter(s => {
          const daysUntil = differenceInDays(new Date(s.next_calibration_date), now);
          return daysUntil > 0 && daysUntil <= 30;
        }).length;

        const thisMonth = recordsData.filter(r => {
          const date = new Date(r.calibration_date);
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;

        setStats({
          totalSchedules: schedulesData.length,
          overdueCalibrations: overdue,
          upcomingCalibrations: upcoming,
          completedThisMonth: thisMonth,
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: { en: string; ar: string }; variant: any }> = {
      scheduled: { label: { en: 'Scheduled', ar: 'مجدول' }, variant: 'default' },
      in_progress: { label: { en: 'In Progress', ar: 'قيد التنفيذ' }, variant: 'default' },
      completed: { label: { en: 'Completed', ar: 'مكتمل' }, variant: 'secondary' },
      overdue: { label: { en: 'Overdue', ar: 'متأخر' }, variant: 'destructive' },
    };

    const statusConfig = config[status] || config.scheduled;
    return (
      <Badge variant={statusConfig.variant}>
        {language === 'ar' ? statusConfig.label.ar : statusConfig.label.en}
      </Badge>
    );
  };

  const getResultBadge = (result: string) => {
    const config: Record<string, { label: { en: string; ar: string }; variant: any }> = {
      pass: { label: { en: 'Pass', ar: 'نجح' }, variant: 'default' },
      fail: { label: { en: 'Fail', ar: 'فشل' }, variant: 'destructive' },
      conditional: { label: { en: 'Conditional', ar: 'شرطي' }, variant: 'secondary' },
    };

    const resultConfig = config[result] || config.conditional;
    return (
      <Badge variant={resultConfig.variant}>
        {language === 'ar' ? resultConfig.label.ar : resultConfig.label.en}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { label: { en: string; ar: string }; variant: any }> = {
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

  const getDaysUntilCalibration = (date: string) => {
    return differenceInDays(new Date(date), new Date());
  };

  const filteredSchedules = schedules.filter(schedule =>
    schedule.code.toLowerCase().includes(searchTerm.toLowerCase())
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
            {language === 'ar' ? 'إدارة المعايرة' : 'Calibration Management'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'جدولة ومتابعة معايرة الأجهزة' 
              : 'Schedule and track equipment calibration'}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            {canManage && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إضافة جدول معايرة' : 'Add Schedule'}
              </Button>
            )}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'إضافة جدول معايرة جديد' : 'Add New Calibration Schedule'}</DialogTitle>
              <DialogDescription>
                {language === 'ar' ? 'أدخل تفاصيل جدول المعايرة' : 'Enter calibration schedule details'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الرمز*' : 'Code*'}</Label>
                <Input 
                  placeholder={language === 'ar' ? 'أدخل الرمز' : 'Enter code'} 
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الأولوية' : 'Priority'}</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر الأولوية' : 'Select priority'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">{language === 'ar' ? 'عالي' : 'High'}</SelectItem>
                    <SelectItem value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</SelectItem>
                    <SelectItem value="low">{language === 'ar' ? 'منخفض' : 'Low'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'التكرار (بالأشهر)' : 'Frequency (months)'}</Label>
                <Input 
                  type="number" 
                  placeholder="12" 
                  value={formData.frequency_months}
                  onChange={(e) => setFormData({...formData, frequency_months: parseInt(e.target.value) || 12})}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'تاريخ المعايرة القادمة*' : 'Next Calibration Date*'}</Label>
                <Input 
                  type="date"
                  value={formData.next_calibration_date}
                  onChange={(e) => setFormData({...formData, next_calibration_date: e.target.value})}
                />
              </div>
              <Button className="w-full" onClick={handleSaveSchedule} disabled={saving}>
                {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي الجداول' : 'Total Schedules'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSchedules}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'جدول معايرة نشط' : 'active schedules'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'معايرات متأخرة' : 'Overdue Calibrations'}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdueCalibrations}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'يحتاج معايرة فورية' : 'needs immediate action'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'معايرات قادمة' : 'Upcoming Calibrations'}
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingCalibrations}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'خلال 30 يوم' : 'within 30 days'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
            {language === 'ar' ? 'مكتمل هذا الشهر' : 'Completed This Month'}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'معايرة مكتملة' : 'calibrations completed'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Schedules and Records */}
      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedules">
            {language === 'ar' ? 'الجداول' : 'Schedules'}
          </TabsTrigger>
          <TabsTrigger value="records">
            {language === 'ar' ? 'السجلات' : 'Records'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{language === 'ar' ? 'جداول المعايرة' : 'Calibration Schedules'}</CardTitle>
                  <CardDescription>
                    {language === 'ar' 
                      ? 'جداول المعايرة المخططة للأجهزة' 
                      : 'Planned calibration schedules for equipment'}
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
                    <TableHead>{language === 'ar' ? 'الأولوية' : 'Priority'}</TableHead>
                    <TableHead>{language === 'ar' ? 'التكرار' : 'Frequency'}</TableHead>
                    <TableHead>{language === 'ar' ? 'آخر معايرة' : 'Last Calibration'}</TableHead>
                    <TableHead>{language === 'ar' ? 'المعايرة القادمة' : 'Next Calibration'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {language === 'ar' ? 'لا توجد جداول معايرة' : 'No calibration schedules found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSchedules.map((schedule) => {
                      const daysUntil = getDaysUntilCalibration(schedule.next_calibration_date);
                      const isOverdue = daysUntil < 0;
                      const isUpcoming = daysUntil >= 0 && daysUntil <= 30;

                      return (
                        <TableRow key={schedule.id} className={isOverdue ? 'bg-destructive/5' : isUpcoming ? 'bg-warning/5' : ''}>
                          <TableCell className="font-medium">{schedule.code}</TableCell>
                          <TableCell>{getPriorityBadge(schedule.priority)}</TableCell>
                          <TableCell>
                            {language === 'ar' 
                              ? `كل ${schedule.frequency_months} شهر` 
                              : `Every ${schedule.frequency_months} months`}
                          </TableCell>
                          <TableCell>
                            {schedule.last_calibration_date 
                              ? format(new Date(schedule.last_calibration_date), 'MMM dd, yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span>{format(new Date(schedule.next_calibration_date), 'MMM dd, yyyy')}</span>
                              {isOverdue && (
                                <span className="text-xs text-destructive flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {Math.abs(daysUntil)} {language === 'ar' ? 'يوم متأخر' : 'days overdue'}
                                </span>
                              )}
                              {isUpcoming && !isOverdue && (
                                <span className="text-xs text-warning flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {daysUntil} {language === 'ar' ? 'يوم متبقي' : 'days left'}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'سجلات المعايرة' : 'Calibration Records'}</CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'سجل المعايرات المكتملة' 
                  : 'Record of completed calibrations'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'الرمز' : 'Code'}</TableHead>
                    <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead>{language === 'ar' ? 'نفذت بواسطة' : 'Performed By'}</TableHead>
                    <TableHead>{language === 'ar' ? 'النتيجة' : 'Result'}</TableHead>
                    <TableHead>{language === 'ar' ? 'رقم الشهادة' : 'Certificate'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'التكلفة' : 'Cost'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {language === 'ar' ? 'لا توجد سجلات معايرة' : 'No calibration records found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.code}</TableCell>
                        <TableCell>{format(new Date(record.calibration_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{record.performed_by}</TableCell>
                        <TableCell>{getResultBadge(record.result)}</TableCell>
                        <TableCell>{record.certificate_number || '-'}</TableCell>
                        <TableCell className="text-right">
                          {record.cost ? `${record.cost.toLocaleString()} SAR` : '-'}
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
