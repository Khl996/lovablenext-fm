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
  is_critical?: boolean;
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
    const statusMap: Record<string, { label: string; variant: any }> = {
      scheduled: { label: language === 'ar' ? 'مجدولة' : 'Scheduled', variant: 'default' },
      in_progress: { label: language === 'ar' ? 'قيد التنفيذ' : 'In Progress', variant: 'secondary' },
      completed: { label: language === 'ar' ? 'مكتملة' : 'Completed', variant: 'default' },
      overdue: { label: language === 'ar' ? 'متأخرة' : 'Overdue', variant: 'destructive' }
    };
    const statusInfo = statusMap[status] || statusMap.scheduled;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: any }> = {
      preventive: { label: language === 'ar' ? 'وقائية' : 'Preventive', variant: 'default' },
      corrective: { label: language === 'ar' ? 'تصحيحية' : 'Corrective', variant: 'destructive' },
      predictive: { label: language === 'ar' ? 'تنبؤية' : 'Predictive', variant: 'secondary' },
      routine: { label: language === 'ar' ? 'روتينية' : 'Routine', variant: 'outline' }
    };
    const typeInfo = types[type] || types.routine;
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
  };

  const filteredTasks = tasks.filter(task =>
    searchQuery === '' ||
    task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.name_ar.includes(searchQuery) ||
    task.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getOverdueTasks = () => {
    const now = new Date();
    return tasks.filter(task => 
      new Date(task.end_date) < now && 
      task.status !== 'completed'
    );
  };

  const getUpcomingTasks = () => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return tasks.filter(task => 
      new Date(task.start_date) >= now && 
      new Date(task.start_date) <= weekFromNow &&
      task.status === 'scheduled'
    );
  };

  const calculateCompletionRate = () => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  };

  const filteredPlans = plans.filter(plan =>
    planSearchQuery === '' ||
    plan.name.toLowerCase().includes(planSearchQuery.toLowerCase()) ||
    plan.name_ar.includes(planSearchQuery) ||
    plan.code.toLowerCase().includes(planSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hospitalId) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {language === 'ar' ? 'لا يوجد مستشفى مرتبط' : 'No Hospital Linked'}
            </h3>
            <p className="text-muted-foreground text-center">
              {language === 'ar' 
                ? 'لا يوجد مستشفى مرتبط بحسابك. يرجى التواصل مع المسؤول.' 
                : 'No hospital is linked to your account. Please contact the administrator.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('maintenance')}</h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'إدارة خطط ومهام الصيانة' : 'Manage maintenance plans and tasks'}
          </p>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <MaintenanceStats
        totalTasks={tasks.length}
        completedTasks={tasks.filter(t => t.status === 'completed').length}
        inProgressTasks={tasks.filter(t => t.status === 'in_progress').length}
        overdueTasks={getOverdueTasks().length}
        upcomingTasks={getUpcomingTasks().length}
        completionRate={calculateCompletionRate()}
        language={language}
      />

      {/* Charts Section */}
      <MaintenanceChart tasks={tasks} language={language} />

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
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle>{language === 'ar' ? 'مهام الصيانة' : 'Maintenance Tasks'}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Mode Selector */}
                  <div className="flex items-center gap-1 border rounded-md p-1">
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="h-8 px-3"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('kanban')}
                      className="h-8 px-3"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('timeline')}
                      className="h-8 px-3"
                    >
                      <GitCommit className="h-4 w-4" />
                    </Button>
                  </div>
                  <ExportButton data={filteredTasks} filename="maintenance_tasks" language={language} />
                  <Button onClick={() => setShowTaskDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'إضافة مهمة' : 'Add Task'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder={language === 'ar' ? 'النوع' : 'Type'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                    <SelectItem value="preventive">{language === 'ar' ? 'وقائية' : 'Preventive'}</SelectItem>
                    <SelectItem value="corrective">{language === 'ar' ? 'تصحيحية' : 'Corrective'}</SelectItem>
                    <SelectItem value="predictive">{language === 'ar' ? 'تنبؤية' : 'Predictive'}</SelectItem>
                    <SelectItem value="routine">{language === 'ar' ? 'روتينية' : 'Routine'}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                    <SelectItem value="scheduled">{language === 'ar' ? 'مجدولة' : 'Scheduled'}</SelectItem>
                    <SelectItem value="in_progress">{language === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</SelectItem>
                    <SelectItem value="completed">{language === 'ar' ? 'مكتملة' : 'Completed'}</SelectItem>
                    <SelectItem value="overdue">{language === 'ar' ? 'متأخرة' : 'Overdue'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tasks Views */}
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد مهام' : 'No tasks found'}
                </div>
              ) : viewMode === 'kanban' ? (
                <KanbanBoard tasks={filteredTasks} language={language} />
              ) : viewMode === 'timeline' ? (
                <TimelineView tasks={filteredTasks} language={language} />
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'الرمز' : 'Code'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                        <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                        <TableHead>{language === 'ar' ? 'تاريخ البدء' : 'Start Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</TableHead>
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
                          <TableCell className="font-mono">{task.code}</TableCell>
                          <TableCell className="font-medium">
                            {language === 'ar' ? task.name_ar : task.name}
                          </TableCell>
                          <TableCell>{getTypeBadge(task.type)}</TableCell>
                          <TableCell>{format(new Date(task.start_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{format(new Date(task.end_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-2 w-16">
                                <div 
                                  className="bg-primary h-2 rounded-full" 
                                  style={{ width: `${task.progress || 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {task.progress || 0}%
                              </span>
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
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle>{language === 'ar' ? 'خطط الصيانة' : 'Maintenance Plans'}</CardTitle>
                <div className="flex items-center gap-2">
                  <ExportButton data={filteredPlans} filename="maintenance_plans" language={language} />
                  <Button onClick={() => setShowPlanDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'إضافة خطة' : 'Add Plan'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plans Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'ar' ? 'بحث في الخطط...' : 'Search plans...'}
                  value={planSearchQuery}
                  onChange={(e) => setPlanSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد خطط' : 'No plans found'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPlans.map((plan) => (
                    <Card key={plan.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {language === 'ar' ? plan.name_ar : plan.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{plan.code}</Badge>
                          <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                            {plan.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'مكتمل' : 'Completed')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            {language === 'ar' ? 'السنة' : 'Year'}
                          </span>
                          <span className="font-semibold">{plan.year}</span>
                        </div>
                        {plan.department && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{language === 'ar' ? 'القسم' : 'Department'}</span>
                            <span className="font-semibold">{plan.department}</span>
                          </div>
                        )}
                        {plan.budget && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{language === 'ar' ? 'الميزانية' : 'Budget'}</span>
                            <span className="font-semibold">{plan.budget.toLocaleString()} {language === 'ar' ? 'ريال' : 'SAR'}</span>
                          </div>
                        )}
                        {plan.completion_rate !== null && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{language === 'ar' ? 'معدل الإنجاز' : 'Completion'}</span>
                              <span className="font-semibold">{plan.completion_rate}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all" 
                                style={{ width: `${plan.completion_rate}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <MaintenanceTaskFormDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        onSuccess={() => {
          setShowTaskDialog(false);
          loadTasks();
        }}
      />

      <MaintenancePlanFormDialog
        open={showPlanDialog}
        onOpenChange={setShowPlanDialog}
        plan={selectedPlan}
        onSuccess={() => {
          setShowPlanDialog(false);
          setSelectedPlan(null);
          loadPlans();
        }}
      />
    </div>
  );
}
