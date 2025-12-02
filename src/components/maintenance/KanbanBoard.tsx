import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Calendar, User, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type KanbanBoardProps = {
  tasks: any[];
  language: string;
  onTaskUpdated?: () => void;
};

export function KanbanBoard({ tasks, language, onTaskUpdated }: KanbanBoardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [draggedTask, setDraggedTask] = useState<any>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const columns = [
    {
      id: 'scheduled',
      title: language === 'ar' ? 'مجدولة' : 'Scheduled',
      status: 'scheduled',
      color: 'bg-info/10 border-info',
      borderColor: '#3b82f6'
    },
    {
      id: 'in_progress',
      title: language === 'ar' ? 'قيد التنفيذ' : 'In Progress',
      status: 'in_progress',
      color: 'bg-warning/10 border-warning',
      borderColor: '#f59e0b'
    },
    {
      id: 'completed',
      title: language === 'ar' ? 'مكتملة' : 'Completed',
      status: 'completed',
      color: 'bg-success/10 border-success',
      borderColor: '#22c55e'
    },
    {
      id: 'overdue',
      title: language === 'ar' ? 'متأخرة' : 'Overdue',
      status: 'overdue',
      color: 'bg-destructive/10 border-destructive',
      borderColor: '#ef4444'
    }
  ];

  const getTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: any; icon: string }> = {
      preventive: { 
        label: language === 'ar' ? 'وقائية' : 'Preventive', 
        variant: 'default',
        icon: '🛡️'
      },
      corrective: { 
        label: language === 'ar' ? 'تصحيحية' : 'Corrective', 
        variant: 'destructive',
        icon: '🔧'
      },
      predictive: { 
        label: language === 'ar' ? 'تنبؤية' : 'Predictive', 
        variant: 'secondary',
        icon: '🔮'
      },
      routine: { 
        label: language === 'ar' ? 'روتينية' : 'Routine', 
        variant: 'outline',
        icon: '📅'
      }
    };
    const typeInfo = types[type] || types.routine;
    return (
      <Badge variant={typeInfo.variant} className="text-xs">
        {typeInfo.icon} {typeInfo.label}
      </Badge>
    );
  };

  const handleDragStart = (e: React.DragEvent, task: any) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedTask || draggedTask.status === targetStatus) {
      setDraggedTask(null);
      return;
    }

    // Don't allow moving to 'overdue' - it's a calculated status
    if (targetStatus === 'overdue') {
      toast({
        title: language === 'ar' ? 'غير مسموح' : 'Not Allowed',
        description: language === 'ar' 
          ? 'لا يمكن نقل المهام إلى عمود المتأخرة يدوياً' 
          : 'Tasks cannot be manually moved to Overdue',
        variant: 'destructive',
      });
      setDraggedTask(null);
      return;
    }

    try {
      const updateData: any = { status: targetStatus };
      
      // Set progress based on status
      if (targetStatus === 'completed') {
        updateData.progress = 100;
      } else if (targetStatus === 'scheduled') {
        updateData.progress = 0;
      }

      const { error } = await supabase
        .from('maintenance_tasks')
        .update(updateData)
        .eq('id', draggedTask.id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' 
          ? `تم نقل المهمة إلى "${columns.find(c => c.status === targetStatus)?.title}"`
          : `Task moved to "${columns.find(c => c.status === targetStatus)?.title}"`,
      });

      // Callback to refresh data
      onTaskUpdated?.();
    } catch (error: any) {
      console.error('Error updating task status:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDraggedTask(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => {
        const columnTasks = tasks.filter(t => t.status === column.status);
        const isDragOver = dragOverColumn === column.id;
        
        return (
          <div 
            key={column.id} 
            className="space-y-3"
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            <div className={`p-3 rounded-lg border-2 ${column.color} ${isDragOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
              <h3 className="font-semibold text-sm flex items-center justify-between">
                {column.title}
                <Badge variant="secondary" className="ml-2">
                  {columnTasks.length}
                </Badge>
              </h3>
            </div>
            
            <div 
              className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
                isDragOver ? 'bg-primary/5 border-2 border-dashed border-primary/30' : ''
              }`}
            >
              {columnTasks.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    {language === 'ar' ? 'لا توجد مهام' : 'No tasks'}
                    {isDragOver && (
                      <p className="mt-2 text-primary font-medium">
                        {language === 'ar' ? 'أفلت هنا' : 'Drop here'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                columnTasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className={`cursor-grab hover:shadow-lg transition-all duration-300 border-l-4 ${
                      draggedTask?.id === task.id ? 'opacity-50 scale-95' : ''
                    }`}
                    style={{ borderLeftColor: column.borderColor }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <CardTitle 
                            className="text-sm font-semibold leading-tight cursor-pointer hover:text-primary"
                            onClick={() => navigate(`/admin/maintenance/${task.code}`)}
                          >
                            {language === 'ar' ? task.name_ar : task.name}
                          </CardTitle>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {getTypeBadge(task.type)}
                        <Badge variant="outline" className="text-xs">
                          {task.code}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                      {task.progress !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{language === 'ar' ? 'التقدم' : 'Progress'}</span>
                            <span>{task.progress}%</span>
                          </div>
                          <Progress value={task.progress} className="h-2" />
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(task.start_date), 'dd/MM/yyyy')}</span>
                        <span>-</span>
                        <span>{format(new Date(task.end_date), 'dd/MM/yyyy')}</span>
                      </div>
                      
                      {task.assigned_to && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{language === 'ar' ? 'تم التعيين' : 'Assigned'}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
