import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

type ChartProps = {
  tasks: any[];
  language: string;
};

export function MaintenanceChart({ tasks, language }: ChartProps) {
  // Prepare data for status distribution
  const statusData = [
    { name: language === 'ar' ? 'مجدولة' : 'Scheduled', value: tasks.filter(t => t.status === 'scheduled').length, color: '#3b82f6' },
    { name: language === 'ar' ? 'قيد التنفيذ' : 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: '#06b6d4' },
    { name: language === 'ar' ? 'مكتملة' : 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: '#22c55e' },
    { name: language === 'ar' ? 'متأخرة' : 'Overdue', value: tasks.filter(t => t.status === 'overdue').length, color: '#ef4444' }
  ];

  // Prepare data for type distribution
  const typeData = [
    { name: language === 'ar' ? 'وقائية' : 'Preventive', value: tasks.filter(t => t.type === 'preventive').length },
    { name: language === 'ar' ? 'تصحيحية' : 'Corrective', value: tasks.filter(t => t.type === 'corrective').length },
    { name: language === 'ar' ? 'تنبؤية' : 'Predictive', value: tasks.filter(t => t.type === 'predictive').length },
    { name: language === 'ar' ? 'روتينية' : 'Routine', value: tasks.filter(t => t.type === 'routine').length }
  ];

  // Prepare data for monthly progress (mock data - you can enhance this with real monthly data)
  const monthlyData = [
    { month: language === 'ar' ? 'يناير' : 'Jan', completed: 45, scheduled: 60 },
    { month: language === 'ar' ? 'فبراير' : 'Feb', completed: 52, scheduled: 65 },
    { month: language === 'ar' ? 'مارس' : 'Mar', completed: 48, scheduled: 58 },
    { month: language === 'ar' ? 'أبريل' : 'Apr', completed: 61, scheduled: 70 },
    { month: language === 'ar' ? 'مايو' : 'May', completed: 55, scheduled: 62 },
    { month: language === 'ar' ? 'يونيو' : 'Jun', completed: 58, scheduled: 68 }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Status Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'توزيع حالة المهام' : 'Task Status Distribution'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Type Distribution Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'توزيع أنواع الصيانة' : 'Maintenance Types'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Progress Line Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'التقدم الشهري' : 'Monthly Progress'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="completed" stroke="hsl(var(--success))" strokeWidth={2} name={language === 'ar' ? 'المكتملة' : 'Completed'} />
              <Line type="monotone" dataKey="scheduled" stroke="hsl(var(--primary))" strokeWidth={2} name={language === 'ar' ? 'المجدولة' : 'Scheduled'} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
