import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Calendar, AlertTriangle, CheckCircle2, Clock, Wrench, FileText, LayoutGrid, List, GitCommit } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { MaintenanceTaskFormDialog } from '@/components/admin/MaintenanceTaskFormDialog';
import { MaintenancePlanFormDialog } from '@/components/admin/MaintenancePlanFormDialog';
import { MaintenanceStats } from '@/components/maintenance/MaintenanceStats';
import { MaintenanceChart } from '@/components/maintenance/MaintenanceChart';
import { KanbanBoard } from '@/components/maintenance/KanbanBoard';
import { TimelineView } from '@/components/maintenance/TimelineView';
import { ExportButton } from '@/components/maintenance/ExportButton';

type MaintenanceTask = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  assigned_to: string | null;
  progress: number;
  plan_id: string;
};

type MaintenancePlan = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  year: number;
  status: string;
  department: string | null;
  budget: number | null;
  completion_rate: number | null;
};

export default function Maintenance() {
  const { t, language } = useLanguage();
  const { hospitalId, permissions } = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'timeline'>('table');
  const [planSearchQuery, setPlanSearchQuery] = useState('');

  useEffect(() => {
    if (hospitalId) {
      loadPlans();
      loadTasks();
    } else {
      setLoading(false);
    }
  }, [hospitalId, statusFilter, typeFilter]);

  const loadPlans = async () => {
    if (!hospitalId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_plans')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('year', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!hospitalId) return;
    try {
      let query = supabase
        .from('maintenance_tasks')
        .select(`
          *,
          maintenance_plans!inner(hospital_id)
        `)
        .eq('maintenance_plans.hospital_id', hospitalId)
        .order('start_date', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      scheduled: { variant: 'secondary', label: language === 'ar' ? 'مجدولة' : 'Scheduled' },
      in_progress: { variant: 'default', label: language === 'ar' ? 'قيد التنفيذ' : 'In Progress' },
      completed: { variant: 'default', label: language === 'ar' ? 'مكتملة' : 'Completed' },
      overdue: { variant: 'destructive', label: language === 'ar' ? 'متأخرة' : 'Overdue' },
    };
    const statusInfo = variants[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const types: Record<string, { icon: any; label: string; color: string }> = {
      preventive: { icon: Calendar, label: language === 'ar' ? 'وقائية' : 'Preventive', color: 'text-blue-500' },
      corrective: { icon: Wrench, label: language === 'ar' ? 'تصحيحية' : 'Corrective', color: 'text-orange-500' },
      predictive: { icon: AlertTriangle, label: language === 'ar' ? 'تنبؤية' : 'Predictive', color: 'text-purple-500' },
      emergency: { icon: AlertTriangle, label: language === 'ar' ? 'طارئة' : 'Emergency', color: 'text-red-500' },
    };
    const typeInfo = types[type] || { icon: Wrench, label: type, color: 'text-gray-500' };
    const Icon = typeInfo.icon;
    return (
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${typeInfo.color}`} />
        <span>{typeInfo.label}</span>
      </div>
    );
  };

  const filteredTasks = tasks.filter(task => 
    task.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.name_ar.includes(searchQuery)
  );

  const getOverdueTasks = () => {
    const now = new Date();
    return tasks.filter(task => 
      new Date(task.end_date) < now && task.status !== 'completed'
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hospitalId) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              {language === 'ar' ? 'لا يوجد مستشفى مرتبط بحسابك. يرجى التواصل مع المسؤول.' : 'No hospital associated with your account. Please contact administrator.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Maintenance is accessible to all authenticated users

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{language === 'ar' ? 'الصيانة' : 'Maintenance'}</h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'إدارة خطط ومهام الصيانة' : 'Manage maintenance plans and tasks'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'إجمالي المهام' : 'Total Tasks'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'المكتملة' : 'Completed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {tasks.filter(t => t.status === 'completed').length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {tasks.filter(t => t.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'متأخرة' : 'Overdue'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {getOverdueTasks().length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tasks">
            <Wrench className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'المهام' : 'Tasks'}
          </TabsTrigger>
          <TabsTrigger value="plans">
            <FileText className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'الخطط' : 'Plans'}
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <div className="flex justify-end">
            {permissions.hasPermission('execute_maintenance') && (
              <Button onClick={() => setShowTaskDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إضافة مهمة' : 'Add Task'}
              </Button>
            )}
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder={language === 'ar' ? 'النوع' : 'Type'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                    <SelectItem value="preventive">{language === 'ar' ? 'وقائية' : 'Preventive'}</SelectItem>
                    <SelectItem value="corrective">{language === 'ar' ? 'تصحيحية' : 'Corrective'}</SelectItem>
                    <SelectItem value="predictive">{language === 'ar' ? 'تنبؤية' : 'Predictive'}</SelectItem>
                    <SelectItem value="routine">{language === 'ar' ? 'روتينية' : 'Routine'}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                    <SelectItem value="scheduled">{language === 'ar' ? 'مجدولة' : 'Scheduled'}</SelectItem>
                    <SelectItem value="in_progress">{language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</SelectItem>
                    <SelectItem value="completed">{language === 'ar' ? 'مكتملة' : 'Completed'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'لا توجد مهام صيانة' : 'No maintenance tasks found'}
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'الرمز' : 'Code'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المهمة' : 'Task'}</TableHead>
                        <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                        <TableHead>{language === 'ar' ? 'تاريخ البداية' : 'Start Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'تاريخ النهاية' : 'End Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'التقدم' : 'Progress'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task) => (
                        <TableRow 
                          key={task.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/admin/maintenance/${task.code}`)}
                        >
                          <TableCell className="font-medium">{task.code}</TableCell>
                          <TableCell>{language === 'ar' ? task.name_ar : task.name}</TableCell>
                          <TableCell>{getTypeBadge(task.type)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(task.start_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(task.end_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all" 
                                  style={{ width: `${task.progress || 0}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">{task.progress || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <div className="flex justify-end">
            {permissions.hasPermission('manage_maintenance_plans') && (
              <Button onClick={() => setShowPlanDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إضافة خطة' : 'Add Plan'}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{language === 'ar' ? plan.name_ar : plan.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{plan.code}</p>
                    </div>
                    <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                      {plan.status === 'active' 
                        ? (language === 'ar' ? 'نشط' : 'Active')
                        : (language === 'ar' ? 'منتهي' : 'Completed')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'السنة' : 'Year'}</span>
                    <span className="font-semibold">{plan.year}</span>
                  </div>
                  {plan.department && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{language === 'ar' ? 'القسم' : 'Department'}</span>
                      <span className="font-medium">{plan.department}</span>
                    </div>
                  )}
                  {plan.budget && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{language === 'ar' ? 'الميزانية' : 'Budget'}</span>
                      <span className="font-semibold">{plan.budget.toLocaleString()} {language === 'ar' ? 'ريال' : 'SAR'}</span>
                    </div>
                  )}
                  {plan.completion_rate !== null && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">{language === 'ar' ? 'نسبة الإنجاز' : 'Completion'}</span>
                        <span className="font-semibold">{plan.completion_rate}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: `${plan.completion_rate}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {plans.length === 0 && (
              <div className="col-span-full text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'لا توجد خطط صيانة' : 'No maintenance plans found'}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <MaintenanceTaskFormDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        onSuccess={() => {
          loadTasks();
          setShowTaskDialog(false);
        }}
      />

      <MaintenancePlanFormDialog
        open={showPlanDialog}
        onOpenChange={setShowPlanDialog}
        onSuccess={() => {
          loadPlans();
          setShowPlanDialog(false);
        }}
      />
    </div>
  );
}
