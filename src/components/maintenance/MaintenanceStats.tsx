import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Calendar, Wrench } from 'lucide-react';

type StatsProps = {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
  completionRate: number;
  language: string;
};

export function MaintenanceStats({
  totalTasks,
  completedTasks,
  inProgressTasks,
  overdueTasks,
  upcomingTasks,
  completionRate,
  language
}: StatsProps) {
  const stats = [
    {
      title: language === 'ar' ? 'إجمالي المهام' : 'Total Tasks',
      value: totalTasks,
      icon: Wrench,
      color: 'bg-primary/10 text-primary',
      iconColor: 'text-primary'
    },
    {
      title: language === 'ar' ? 'المهام المكتملة' : 'Completed',
      value: completedTasks,
      icon: CheckCircle2,
      color: 'bg-success/10 text-success',
      iconColor: 'text-success'
    },
    {
      title: language === 'ar' ? 'قيد التنفيذ' : 'In Progress',
      value: inProgressTasks,
      icon: Clock,
      color: 'bg-info/10 text-info',
      iconColor: 'text-info'
    },
    {
      title: language === 'ar' ? 'المتأخرة' : 'Overdue',
      value: overdueTasks,
      icon: AlertTriangle,
      color: 'bg-destructive/10 text-destructive',
      iconColor: 'text-destructive'
    },
    {
      title: language === 'ar' ? 'القادمة' : 'Upcoming',
      value: upcomingTasks,
      icon: Calendar,
      color: 'bg-warning/10 text-warning',
      iconColor: 'text-warning'
    },
    {
      title: language === 'ar' ? 'معدل الإنجاز' : 'Completion Rate',
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: 'bg-accent/10 text-accent',
      iconColor: 'text-accent'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.color}`}>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {index === stats.length - 1 && (
              <Progress value={completionRate} className="mt-2" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
