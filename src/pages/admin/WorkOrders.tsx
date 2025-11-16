import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { WorkOrderFormDialog } from '@/components/admin/WorkOrderFormDialog';
import { useLookupTables, getLookupName } from '@/hooks/useLookupTables';

type WorkOrder = {
  id: string;
  code: string;
  description: string;
  issue_type: string;
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
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { loading: userLoading, permissions } = useCurrentUser();
  const { lookups, loading: lookupsLoading } = useLookupTables(['priorities', 'work_order_statuses']);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const t = {
    title: language === 'ar' ? 'بلاغات الصيانة' : 'Maintenance Reports',
    description: language === 'ar' ? 'إدارة بلاغات الصيانة والإصلاح' : 'Manage maintenance and repair reports',
    addNew: language === 'ar' ? 'بلاغ صيانة جديد' : 'New Maintenance Report',
    search: language === 'ar' ? 'بحث برقم البلاغ أو الوصف...' : 'Search by code or description...',
    filter: language === 'ar' ? 'فلترة' : 'Filter',
    all: language === 'ar' ? 'الكل' : 'All',
    status: language === 'ar' ? 'الحالة' : 'Status',
    priority: language === 'ar' ? 'الأولوية' : 'Priority',
    results: language === 'ar' ? 'نتيجة' : 'results',
    clearFilters: language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters',
    noPermission: language === 'ar' ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة' : 'You do not have permission to access this page',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...',
    noWorkOrders: language === 'ar' ? 'لا توجد بلاغات صيانة' : 'No maintenance reports found',
    noResults: language === 'ar' ? 'لا توجد نتائج مطابقة للبحث' : 'No results match your search',
    code: language === 'ar' ? 'رقم البلاغ' : 'Code',
    issueType: language === 'ar' ? 'نوع البلاغ' : 'Issue Type',
    location: language === 'ar' ? 'الموقع' : 'Location',
    reportedDate: language === 'ar' ? 'تاريخ البلاغ' : 'Reported Date',
  };

  const { hospitalId } = useCurrentUser();

  useEffect(() => {
    if (hospitalId) {
      loadWorkOrders();
    } else {
      setLoading(false);
    }
  }, [hospitalId]);

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

  const getStatusBadgeVariant = (statusCode: string) => {
    const status = lookups.work_order_statuses?.find(s => s.code === statusCode);
    if (!status) return 'outline';
    
    // Use category to determine variant
    switch (status.category) {
      case 'closed':
        return statusCode === 'cancelled' ? 'destructive' : 'default';
      case 'in_progress':
        return 'secondary';
      case 'open':
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priorityCode: string) => {
    const priority = lookups.priorities?.find(p => p.code === priorityCode);
    if (!priority) return 'outline';
    
    // Use level to determine variant
    if (priority.level >= 4) return 'destructive'; // urgent
    if (priority.level >= 3) return 'default'; // high
    if (priority.level >= 2) return 'secondary'; // medium
    return 'outline'; // low
  };

  const getStatusName = (code: string) => {
    const status = lookups.work_order_statuses?.find(s => s.code === code);
    return status ? getLookupName(status, language) : code;
  };

  const getPriorityName = (code: string) => {
    const priority = lookups.priorities?.find(p => p.code === code);
    return priority ? getLookupName(priority, language) : code;
  };

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch = searchQuery === '' || 
      wo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.issue_type?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || wo.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || priorityFilter !== 'all';

  if (userLoading || loading || lookupsLoading) {
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground mt-1">{t.description}</p>
        </div>
        {permissions.hasPermission('users.create') && (
          <Button onClick={() => setDialogOpen(true)}>
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
                <SelectValue placeholder={t.all} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                {lookups.work_order_statuses?.map((status) => (
                  <SelectItem key={status.code} value={status.code}>
                    {getLookupName(status, language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t.all} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                {lookups.priorities?.map((priority) => (
                  <SelectItem key={priority.code} value={priority.code}>
                    {getLookupName(priority, language)}
                  </SelectItem>
                ))}
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
                <Card 
                  key={wo.id} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => navigate(`/admin/work-orders/${wo.id}`)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{wo.code}</CardTitle>
                        <CardDescription className="mt-1">{wo.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={getStatusBadgeVariant(wo.status)}>
                          {getStatusName(wo.status)}
                        </Badge>
                        <Badge variant={getPriorityBadgeVariant(wo.priority)}>
                          {getPriorityName(wo.priority)}
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

      <WorkOrderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadWorkOrders}
      />
    </div>
  );
}
