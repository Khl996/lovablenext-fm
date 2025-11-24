import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FileText, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Contract {
  id: string;
  code: string;
  title: string;
  title_ar: string;
  contract_type: string;
  vendor_name: string;
  start_date: string;
  end_date: string;
  value: number;
  currency: string;
  status: string;
  renewal_notice_days: number;
}

interface ContractStats {
  activeContracts: number;
  expiringContracts: number;
  totalValue: number;
  expiredContracts: number;
}

export default function Contracts() {
  const { language } = useLanguage();
  const { profile, permissions, loading: userLoading, isFacilityManager, isHospitalAdmin } = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<ContractStats>({
    activeContracts: 0,
    expiringContracts: 0,
    totalValue: 0,
    expiredContracts: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    title_ar: '',
    vendor_name: '',
    contract_type: 'maintenance',
    start_date: '',
    end_date: '',
    value: 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSaveContract = async () => {
    if (!profile?.hospital_id || !formData.code || !formData.title || !formData.vendor_name || !formData.start_date || !formData.end_date) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('contracts')
        .insert({
          hospital_id: profile.hospital_id,
          code: formData.code,
          title: formData.title,
          title_ar: formData.title_ar || formData.title,
          vendor_name: formData.vendor_name,
          contract_type: formData.contract_type,
          start_date: formData.start_date,
          end_date: formData.end_date,
          value: formData.value,
          currency: 'SAR',
          status: 'active',
          created_by: profile.id,
        });

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم إضافة العقد بنجاح' : 'Contract added successfully',
      });

      setDialogOpen(false);
      setFormData({
        code: '',
        title: '',
        title_ar: '',
        vendor_name: '',
        contract_type: 'maintenance',
        start_date: '',
        end_date: '',
        value: 0,
      });
      loadData();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!userLoading && profile?.hospital_id && !isFacilityManager && !isHospitalAdmin && !permissions.hasPermission('contracts.view')) {
      toast({
        title: language === 'ar' ? 'غير مصرح' : 'Unauthorized',
        description: language === 'ar' ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة' : 'You do not have permission to access this page',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [userLoading, profile?.hospital_id, isFacilityManager, isHospitalAdmin, permissions, navigate]);

  useEffect(() => {
    loadData();
  }, [profile?.hospital_id]);

  const loadData = async () => {
    if (!profile?.hospital_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('hospital_id', profile.hospital_id)
        .order('end_date', { ascending: true });

      if (error) throw error;

      setContracts(data || []);

      // Calculate stats
      if (data) {
        const now = new Date();
        const active = data.filter(c => c.status === 'active').length;
        const expiring = data.filter(c => {
          const endDate = new Date(c.end_date);
          const daysUntilExpiry = differenceInDays(endDate, now);
          return c.status === 'active' && daysUntilExpiry <= (c.renewal_notice_days || 30);
        }).length;
        const expired = data.filter(c => c.status === 'expired').length;
        const totalValue = data
          .filter(c => c.status === 'active')
          .reduce((sum, c) => sum + Number(c.value), 0);

        setStats({
          activeContracts: active,
          expiringContracts: expiring,
          totalValue,
          expiredContracts: expired,
        });
      }
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: { en: string; ar: string }; variant: any }> = {
      active: { label: { en: 'Active', ar: 'نشط' }, variant: 'default' },
      expired: { label: { en: 'Expired', ar: 'منتهي' }, variant: 'destructive' },
      terminated: { label: { en: 'Terminated', ar: 'ملغي' }, variant: 'destructive' },
      draft: { label: { en: 'Draft', ar: 'مسودة' }, variant: 'secondary' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge variant={config.variant}>
        {language === 'ar' ? config.label.ar : config.label.en}
      </Badge>
    );
  };

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      maintenance: { en: 'Maintenance', ar: 'صيانة' },
      service: { en: 'Service', ar: 'خدمة' },
      supply: { en: 'Supply', ar: 'توريد' },
      other: { en: 'Other', ar: 'أخرى' },
    };
    return language === 'ar' ? labels[type]?.ar || type : labels[type]?.en || type;
  };

  const getDaysUntilExpiry = (endDate: string) => {
    return differenceInDays(new Date(endDate), new Date());
  };

  const filteredContracts = contracts.filter(contract =>
    contract.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.title_ar.includes(searchTerm) ||
    contract.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8 text-muted-foreground">
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'إدارة العقود' : 'Contract Management'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'إدارة عقود الصيانة والخدمات' 
              : 'Manage maintenance and service contracts'}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إضافة عقد' : 'Add Contract'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'إضافة عقد جديد' : 'Add New Contract'}</DialogTitle>
              <DialogDescription>
                {language === 'ar' ? 'أدخل تفاصيل العقد' : 'Enter contract details'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الرمز*' : 'Code*'}</Label>
                <Input 
                  placeholder={language === 'ar' ? 'أدخل الرمز' : 'Enter code'} 
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العنوان*' : 'Title*'}</Label>
                <Input 
                  placeholder={language === 'ar' ? 'أدخل عنوان العقد' : 'Enter contract title'} 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العنوان بالعربية' : 'Arabic Title'}</Label>
                <Input 
                  placeholder={language === 'ar' ? 'أدخل العنوان بالعربية' : 'Enter Arabic title'} 
                  value={formData.title_ar}
                  onChange={(e) => setFormData({...formData, title_ar: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم المورد*' : 'Vendor Name*'}</Label>
                <Input 
                  placeholder={language === 'ar' ? 'أدخل اسم المورد' : 'Enter vendor name'} 
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'نوع العقد' : 'Contract Type'}</Label>
                <Select value={formData.contract_type} onValueChange={(value) => setFormData({...formData, contract_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر النوع' : 'Select type'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">{language === 'ar' ? 'صيانة' : 'Maintenance'}</SelectItem>
                    <SelectItem value="service">{language === 'ar' ? 'خدمة' : 'Service'}</SelectItem>
                    <SelectItem value="supply">{language === 'ar' ? 'توريد' : 'Supply'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'تاريخ البداية*' : 'Start Date*'}</Label>
                  <Input 
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'تاريخ الانتهاء*' : 'End Date*'}</Label>
                  <Input 
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'القيمة (ر.س)' : 'Value (SAR)'}</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value) || 0})}
                />
              </div>
              <Button className="w-full" onClick={handleSaveContract} disabled={saving}>
                {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
            {language === 'ar' ? 'العقود النشطة' : 'Active Contracts'}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeContracts}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'عقد نشط' : 'active contracts'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'عقود تنتهي قريباً' : 'Expiring Soon'}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringContracts}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'يحتاج تجديد' : 'needs renewal'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي قيمة العقود' : 'Total Contract Value'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalValue.toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'للعقود النشطة' : 'for active contracts'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'عقود منتهية' : 'Expired Contracts'}
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiredContracts}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'عقد منتهي' : 'expired contracts'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{language === 'ar' ? 'جميع العقود' : 'All Contracts'}</CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'عرض وإدارة جميع العقود' 
                  : 'View and manage all contracts'}
              </CardDescription>
            </div>
            <Input
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'الرمز' : 'Code'}</TableHead>
                <TableHead>{language === 'ar' ? 'العنوان' : 'Title'}</TableHead>
                <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                <TableHead>{language === 'ar' ? 'المورد' : 'Vendor'}</TableHead>
                <TableHead>{language === 'ar' ? 'القيمة' : 'Value'}</TableHead>
                <TableHead>{language === 'ar' ? 'تاريخ البداية' : 'Start Date'}</TableHead>
                <TableHead>{language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</TableHead>
                <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {language === 'ar' ? 'لا توجد عقود' : 'No contracts found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((contract) => {
                  const daysUntilExpiry = getDaysUntilExpiry(contract.end_date);
                  const isExpiringSoon = contract.status === 'active' && daysUntilExpiry <= contract.renewal_notice_days;

                  return (
                    <TableRow key={contract.id} className={isExpiringSoon ? 'bg-warning/5' : ''}>
                      <TableCell className="font-medium">{contract.code}</TableCell>
                      <TableCell>
                        {language === 'ar' ? contract.title_ar : contract.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getContractTypeLabel(contract.contract_type)}</Badge>
                      </TableCell>
                      <TableCell>{contract.vendor_name}</TableCell>
                      <TableCell>
                        {contract.value.toLocaleString()} {contract.currency}
                      </TableCell>
                      <TableCell>{format(new Date(contract.start_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>{format(new Date(contract.end_date), 'MMM dd, yyyy')}</span>
                          {isExpiringSoon && (
                            <span className="text-xs text-warning flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {daysUntilExpiry} {language === 'ar' ? 'يوم متبقي' : 'days left'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
