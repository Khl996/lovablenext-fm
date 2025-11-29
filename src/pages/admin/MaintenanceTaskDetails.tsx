import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Clock, Wrench, AlertTriangle, CheckCircle2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { MaintenanceTaskFormDialog } from '@/components/admin/MaintenanceTaskFormDialog';

export default function MaintenanceTaskDetails() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { hospitalId, permissions } = useCurrentUser();
  const { toast } = useToast();

  const [task, setTask] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [checklist, setChecklist] = useState<any[]>([]);

  useEffect(() => {
    if (code && hospitalId) {
      loadTask();
    }
  }, [code, hospitalId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      
      // Load task
      const { data: taskData, error: taskError } = await supabase
        .from('maintenance_tasks')
        .select(`
          *,
          maintenance_plans!inner(*)
        `)
        .eq('code', code)
        .eq('maintenance_plans.hospital_id', hospitalId)
        .single();

      if (taskError) throw taskError;
      setTask(taskData);
      setPlan(taskData.maintenance_plans);
      
      if (taskData.checklist && Array.isArray(taskData.checklist)) {
        setChecklist(taskData.checklist);
      }

      // Load team if assigned
      if (taskData.assigned_to) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', taskData.assigned_to)
          .maybeSingle();
        if (teamData) setTeam(teamData);
      }
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/maintenance');
    } finally {
      setLoading(false);
    }
  };

  const updateChecklistItem = async (itemId: string, completed: boolean) => {
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed } : item
    );
    setChecklist(updatedChecklist);

    // Calculate progress
    const completedItems = updatedChecklist.filter(item => item.completed).length;
    const progress = Math.round((completedItems / updatedChecklist.length) * 100);

    try {
      const { error } = await supabase
        .from('maintenance_tasks')
        .update({ 
          checklist: updatedChecklist,
          progress
        })
        .eq('id', task.id);

      if (error) throw error;

      setTask({ ...task, progress });

      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم تحديث قائمة المراجعة' : 'Checklist updated',
      });
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) throw error;

      setTask({ ...task, status: newStatus });

      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم تحديث حالة المهمة' : 'Task status updated',
      });
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
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
      preventive: { icon: Calendar, label: language === 'ar' ? 'وقائية' : 'Preventive', color: 'text-info' },
      corrective: { icon: Wrench, label: language === 'ar' ? 'تصحيحية' : 'Corrective', color: 'text-warning' },
      predictive: { icon: AlertTriangle, label: language === 'ar' ? 'تنبؤية' : 'Predictive', color: 'text-secondary' },
      routine: { icon: Clock, label: language === 'ar' ? 'روتينية' : 'Routine', color: 'text-success' },
    };
    const typeInfo = types[type] || { icon: Wrench, label: type, color: 'text-muted-foreground' };
    const Icon = typeInfo.icon;
    return (
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${typeInfo.color}`} />
        <span>{typeInfo.label}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/maintenance')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{language === 'ar' ? task.name_ar : task.name}</h1>
            <p className="text-muted-foreground">{task.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(task.status)}
          {permissions.hasPermission('execute_maintenance', hospitalId) && (
            <Button onClick={() => setShowEditDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'تعديل' : 'Edit'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'النوع' : 'Type'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getTypeBadge(task.type)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'التقدم' : 'Progress'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={task.progress || 0} />
              <p className="text-2xl font-bold">{task.progress || 0}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === 'ar' ? 'التكرار' : 'Frequency'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold capitalize">{task.frequency}</p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'التفاصيل' : 'Details'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الخطة' : 'Plan'}</p>
              <p className="font-medium">{language === 'ar' ? plan?.name_ar : plan?.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تاريخ البداية' : 'Start Date'}</p>
                <p className="font-medium">{format(new Date(task.start_date), 'dd/MM/yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تاريخ النهاية' : 'End Date'}</p>
                <p className="font-medium">{format(new Date(task.end_date), 'dd/MM/yyyy')}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المدة' : 'Duration'}</p>
              <p className="font-medium">{task.duration_days} {language === 'ar' ? 'يوم' : 'days'}</p>
            </div>

            {team && (
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الفريق المسؤول' : 'Assigned Team'}</p>
                <p className="font-medium">{language === 'ar' ? team.name_ar : team.name}</p>
              </div>
            )}

            {task.is_critical && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {language === 'ar' ? 'مهمة حرجة' : 'Critical Task'}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Checklist */}
        {checklist.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'قائمة المراجعة' : 'Checklist'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={(checked) => updateChecklistItem(item.id, checked as boolean)}
                      disabled={task.status === 'completed'}
                    />
                    <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Actions */}
      {permissions.hasPermission('execute_maintenance', hospitalId) && task.status !== 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'إجراءات الحالة' : 'Status Actions'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {task.status === 'scheduled' && (
                <Button onClick={() => updateStatus('in_progress')}>
                  {language === 'ar' ? 'بدء التنفيذ' : 'Start Task'}
                </Button>
              )}
              {task.status === 'in_progress' && (
                <Button onClick={() => updateStatus('completed')}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'إكمال المهمة' : 'Complete Task'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <MaintenanceTaskFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={loadTask}
        task={task}
      />
    </div>
  );
}
