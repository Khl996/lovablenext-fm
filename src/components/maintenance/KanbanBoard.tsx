import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Calendar, User, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type KanbanBoardProps = {
  tasks: any[];
  language: string;
};

export function KanbanBoard({ tasks, language }: KanbanBoardProps) {
  const navigate = useNavigate();

  const columns = [
    {
      id: 'scheduled',
      title: language === 'ar' ? 'مجدولة' : 'Scheduled',
      status: 'scheduled',
      color: 'bg-info/10 border-info'
    },
    {
      id: 'in_progress',
      title: language === 'ar' ? 'قيد التنفيذ' : 'In Progress',
      status: 'in_progress',
      color: 'bg-warning/10 border-warning'
    },
    {
      id: 'completed',
      title: language === 'ar' ? 'مكتملة' : 'Completed',
      status: 'completed',
      color: 'bg-success/10 border-success'
    },
    {
      id: 'overdue',
      title: language === 'ar' ? 'متأخرة' : 'Overdue',
      status: 'overdue',
      color: 'bg-destructive/10 border-destructive'
    }
  ];

  const getTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: any; icon: any }> = {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => {
        const columnTasks = tasks.filter(t => t.status === column.status);
        
        return (
          <div key={column.id} className="space-y-3">
            <div className={`p-3 rounded-lg border-2 ${column.color}`}>
              <h3 className="font-semibold text-sm flex items-center justify-between">
                {column.title}
                <Badge variant="secondary" className="ml-2">
                  {columnTasks.length}
                </Badge>
              </h3>
            </div>
            
            <div className="space-y-3">
              {columnTasks.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    {language === 'ar' ? 'لا توجد مهام' : 'No tasks'}
                  </CardContent>
                </Card>
              ) : (
                columnTasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4"
                    style={{ borderLeftColor: column.status === 'scheduled' ? '#3b82f6' : column.status === 'in_progress' ? '#f59e0b' : column.status === 'completed' ? '#22c55e' : '#ef4444' }}
                    onClick={() => navigate(`/admin/maintenance/${task.code}`)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-sm font-semibold leading-tight">
                          {language === 'ar' ? task.name_ar : task.name}
                        </CardTitle>
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
