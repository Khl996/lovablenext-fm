import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileText, Plus } from 'lucide-react';
import { format } from 'date-fns';

type OperationLog = {
  id: string;
  code: string;
  type: string;
  system_type: string;
  asset_name: string;
  location: string;
  technician_name: string;
  reason: string;
  status: string;
  timestamp: string;
  start_time: string | null;
  end_time: string | null;
  actual_duration: number | null;
  notes: string | null;
  previous_status: string | null;
  new_status: string | null;
};

export default function OperationsLog() {
  const { t, language } = useLanguage();
  const { profile, hospitalId, permissions } = useCurrentUser();
  const { toast } = useToast();

  const [operations, setOperations] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (hospitalId) {
      loadOperations();
    } else {
      setLoading(false);
    }
  }, [hospitalId, typeFilter, statusFilter]);

  const loadOperations = async () => {
    if (!hospitalId) return;
    try {
      setLoading(true);
      let query = supabase
        .from('operations_log')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter as any);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOperations(data || []);
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

  const getTypeBadge = (type: string) => {
    const types: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      startup: { variant: 'default', label: language === 'ar' ? 'تشغيل' : 'Startup' },
      shutdown: { variant: 'secondary', label: language === 'ar' ? 'إيقاف' : 'Shutdown' },
      maintenance: { variant: 'outline', label: language === 'ar' ? 'صيانة' : 'Maintenance' },
      emergency: { variant: 'destructive', label: language === 'ar' ? 'طارئ' : 'Emergency' },
    };
    const typeInfo = types[type] || { variant: 'outline' as const, label: type };
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      completed: { variant: 'default', label: language === 'ar' ? 'مكتمل' : 'Completed' },
      pending: { variant: 'secondary', label: language === 'ar' ? 'معلق' : 'Pending' },
      cancelled: { variant: 'destructive', label: language === 'ar' ? 'ملغى' : 'Cancelled' },
    };
    const statusInfo = statuses[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const filteredOperations = operations.filter(op =>
    op.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    op.asset_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    op.technician_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    op.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isPlatformOwner = profile?.role === 'platform_owner' || profile?.role === 'platform_admin';

  if (!hospitalId && !isPlatformOwner) {
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

  if (!permissions.hasPermission('operations_log.view', hospitalId)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('accessDenied')}</h3>
          <p className="text-muted-foreground">{t('noPermission')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{language === 'ar' ? 'سجل العمليات' : 'Operations Log'}</h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'سجل جميع عمليات الأصول والمرافق' : 'Log of all asset and facility operations'}
          </p>
        </div>
        {permissions.hasPermission('operations_log.manage', hospitalId) && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'إضافة عملية' : 'Add Operation'}
          </Button>
        )}
      </div>

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
                <SelectItem value="startup">{language === 'ar' ? 'تشغيل' : 'Startup'}</SelectItem>
                <SelectItem value="shutdown">{language === 'ar' ? 'إيقاف' : 'Shutdown'}</SelectItem>
                <SelectItem value="maintenance">{language === 'ar' ? 'صيانة' : 'Maintenance'}</SelectItem>
                <SelectItem value="emergency">{language === 'ar' ? 'طارئ' : 'Emergency'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="completed">{language === 'ar' ? 'مكتمل' : 'Completed'}</SelectItem>
                <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                <SelectItem value="cancelled">{language === 'ar' ? 'ملغى' : 'Cancelled'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOperations.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا توجد عمليات' : 'No operations found'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'الرمز' : 'Code'}</TableHead>
                    <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الأصل' : 'Asset'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الموقع' : 'Location'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الفني' : 'Technician'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الوقت' : 'Time'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOperations.map((op) => (
                    <TableRow key={op.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{op.code}</TableCell>
                      <TableCell>{getTypeBadge(op.type)}</TableCell>
                      <TableCell>{op.asset_name}</TableCell>
                      <TableCell>{op.location}</TableCell>
                      <TableCell>{op.technician_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(op.timestamp), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{getStatusBadge(op.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
