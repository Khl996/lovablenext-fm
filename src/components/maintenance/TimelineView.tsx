import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type TimelineViewProps = {
  tasks: any[];
  language: string;
};

export function TimelineView({ tasks, language }: TimelineViewProps) {
  const navigate = useNavigate();
  
  // Sort tasks by date
  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  // Group tasks by month
  const groupedTasks: Record<string, any[]> = sortedTasks.reduce((acc: Record<string, any[]>, task: any) => {
    const monthKey = format(new Date(task.start_date), 'MMMM yyyy');
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(task);
    return acc;
  }, {});

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-info" />;
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default:
        return <Calendar className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-success bg-success/10';
      case 'in_progress':
        return 'border-info bg-info/10';
      case 'overdue':
        return 'border-destructive bg-destructive/10';
      default:
        return 'border-muted bg-muted/10';
    }
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedTasks).map(([month, monthTasks]) => (
        <div key={month}>
          <div className="mb-4 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {month}
            </h3>
            <div className="h-px bg-border mt-2" />
          </div>
          
          <div className="relative space-y-4 pl-8 border-l-2 border-border">
            {monthTasks.map((task, index) => (
              <div key={task.id} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-[37px] top-2 w-6 h-6 rounded-full border-4 border-background bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-background" />
                </div>
                
                <Card 
                  className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 ${getStatusColor(task.status)}`}
                  onClick={() => navigate(`/admin/maintenance/${task.code}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <h4 className="font-semibold">
                            {language === 'ar' ? task.name_ar : task.name}
                          </h4>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            {task.code}
                          </Badge>
                          <Badge variant={
                            task.type === 'preventive' ? 'default' :
                            task.type === 'corrective' ? 'destructive' :
                            task.type === 'predictive' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {task.type === 'preventive' ? (language === 'ar' ? 'وقائية' : 'Preventive') :
                             task.type === 'corrective' ? (language === 'ar' ? 'تصحيحية' : 'Corrective') :
                             task.type === 'predictive' ? (language === 'ar' ? 'تنبؤية' : 'Predictive') :
                             (language === 'ar' ? 'روتينية' : 'Routine')}
                          </Badge>
                          {task.is_critical && (
                            <Badge variant="destructive" className="text-xs">
                              {language === 'ar' ? '⚠️ حرجة' : '⚠️ Critical'}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(task.start_date), 'dd MMM')}</span>
                          </div>
                          <span>→</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(task.end_date), 'dd MMM')}</span>
                          </div>
                          {task.progress !== undefined && (
                            <>
                              <span>•</span>
                              <span>{task.progress}% {language === 'ar' ? 'مكتمل' : 'complete'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {sortedTasks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{language === 'ar' ? 'لا توجد مهام لعرضها' : 'No tasks to display'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
