import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

type WorkOrder = {
  id: string;
  code: string;
  description: string;
  status: string;
  priority: string;
  reported_at: string;
  assigned_to: string | null;
  reported_by: string;
  building_id: string | null;
  floor_id: string | null;
  department_id: string | null;
  room_id: string | null;
  asset_id: string | null;
};

export default function WorkOrders() {
  const { language } = useLanguage();
  const { loading: userLoading, permissions } = useCurrentUser();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const t = {
    title: language === 'ar' ? 'أوامر العمل' : 'Work Orders',
    description: language === 'ar' ? 'إدارة أوامر الصيانة والإصلاح' : 'Manage maintenance and repair work orders',
    addNew: language === 'ar' ? 'إضافة أمر عمل' : 'Add Work Order',
    search: language === 'ar' ? 'بحث...' : 'Search...',
    filter: language === 'ar' ? 'فلترة' : 'Filter',
    status: {
      all: language === 'ar' ? 'الكل' : 'All',
      pending: language === 'ar' ? 'قيد الانتظار' : 'Pending',
      assigned: language === 'ar' ? 'محددة' : 'Assigned',
      in_progress: language === 'ar' ? 'قيد التنفيذ' : 'In Progress',
      completed: language === 'ar' ? 'مكتملة' : 'Completed',
      approved: language === 'ar' ? 'معتمدة' : 'Approved',
      cancelled: language === 'ar' ? 'ملغية' : 'Cancelled',
    },
    priority: {
      all: language === 'ar' ? 'الكل' : 'All',
      low: language === 'ar' ? 'منخفضة' : 'Low',
      medium: language === 'ar' ? 'متوسطة' : 'Medium',
      high: language === 'ar' ? 'عالية' : 'High',
      urgent: language === 'ar' ? 'عاجلة' : 'Urgent',
    },
    noPermission: language === 'ar' ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة' : 'You do not have permission to access this page',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...',
    noWorkOrders: language === 'ar' ? 'لا توجد أوامر عمل' : 'No work orders found',
  };

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .order('reported_at', { ascending: false });

      if (error) throw error;
      setWorkOrders(data || []);
    } catch (error: any) {
      console.error('Error loading work orders:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'pending':
      case 'assigned':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch = wo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         wo.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || wo.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground mt-1">{t.description}</p>
        </div>
        {permissions.hasPermission('users.create') && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t.addNew}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t.status.all} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.status.all}</SelectItem>
                <SelectItem value="pending">{t.status.pending}</SelectItem>
                <SelectItem value="assigned">{t.status.assigned}</SelectItem>
                <SelectItem value="in_progress">{t.status.in_progress}</SelectItem>
                <SelectItem value="completed">{t.status.completed}</SelectItem>
                <SelectItem value="approved">{t.status.approved}</SelectItem>
                <SelectItem value="cancelled">{t.status.cancelled}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t.priority.all} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.priority.all}</SelectItem>
                <SelectItem value="low">{t.priority.low}</SelectItem>
                <SelectItem value="medium">{t.priority.medium}</SelectItem>
                <SelectItem value="high">{t.priority.high}</SelectItem>
                <SelectItem value="urgent">{t.priority.urgent}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredWorkOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t.noWorkOrders}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWorkOrders.map((wo) => (
                <Card key={wo.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{wo.code}</CardTitle>
                        <CardDescription className="mt-1">{wo.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={getStatusBadgeVariant(wo.status)}>
                          {t.status[wo.status as keyof typeof t.status] || wo.status}
                        </Badge>
                        <Badge variant={getPriorityBadgeVariant(wo.priority)}>
                          {t.priority[wo.priority as keyof typeof t.priority] || wo.priority}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
