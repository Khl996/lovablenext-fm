import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Package, MapPin, Calendar, DollarSign, FileText, Settings, History, Activity } from 'lucide-react';
import { AssetQRCode } from '@/components/admin/AssetQRCode';
import { format } from 'date-fns';

interface AssetDetails {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  category: string;
  status: string;
  criticality: string;
  type?: string;
  subcategory?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  installation_date?: string;
  warranty_expiry?: string;
  warranty_provider?: string;
  expected_lifespan_years?: number;
  depreciation_annual?: number;
  specifications?: any;
  building_id?: string;
  floor_id?: string;
  department_id?: string;
  room_id?: string;
  building_name?: string;
  building_name_ar?: string;
  floor_name?: string;
  floor_name_ar?: string;
  department_name?: string;
  department_name_ar?: string;
  room_name?: string;
  room_name_ar?: string;
}

export default function AssetDetails() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (code) {
      loadAsset();
    }
  }, [code]);

  useEffect(() => {
    if (asset?.id) {
      loadWorkOrders();
      loadActivityLog();
    }
  }, [asset?.id]);

  const loadAsset = async () => {
    try {
      setLoading(true);
      
      // Get asset with location details
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          buildings:building_id (name, name_ar),
          floors:floor_id (name, name_ar),
          departments:department_id (name, name_ar),
          rooms:room_id (name, name_ar)
        `)
        .eq('code', code)
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'الأصل غير موجود' : 'Asset not found',
          variant: 'destructive',
        });
        navigate('/admin/assets');
        return;
      }

      setAsset({
        ...data,
        building_name: data.buildings?.name,
        building_name_ar: data.buildings?.name_ar,
        floor_name: data.floors?.name,
        floor_name_ar: data.floors?.name_ar,
        department_name: data.departments?.name,
        department_name_ar: data.departments?.name_ar,
        room_name: data.rooms?.name,
        room_name_ar: data.rooms?.name_ar,
      });
    } catch (error) {
      console.error('Error loading asset:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل تحميل بيانات الأصل' : 'Failed to load asset data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWorkOrders = async () => {
    if (!asset?.id) return;
    
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, code, issue_type, status, reported_at, description')
        .eq('asset_id', asset.id)
        .order('reported_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setWorkOrders(data || []);
    } catch (error) {
      console.error('Error loading work orders:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadActivityLog = async () => {
    if (!asset?.id) return;
    
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('operations_log')
        .select('*')
        .eq('asset_id', asset.id)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivityLog(data || []);
    } catch (error) {
      console.error('Error loading activity log:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-success',
      inactive: 'bg-muted',
      maintenance: 'bg-warning',
      retired: 'bg-destructive',
    };
    
    const statusLabels: Record<string, { en: string; ar: string }> = {
      active: { en: 'Active', ar: 'نشط' },
      inactive: { en: 'Inactive', ar: 'غير نشط' },
      maintenance: { en: 'Maintenance', ar: 'قيد الصيانة' },
      retired: { en: 'Retired', ar: 'متقاعد' },
    };

    return (
      <Badge className={statusColors[status] || 'bg-muted'}>
        {language === 'ar' ? statusLabels[status]?.ar : statusLabels[status]?.en}
      </Badge>
    );
  };

  const getCriticalityBadge = (criticality: string) => {
    const criticalityColors: Record<string, string> = {
      critical: 'bg-destructive',
      essential: 'bg-warning',
      non_essential: 'bg-info',
    };
    
    const criticalityLabels: Record<string, { en: string; ar: string }> = {
      critical: { en: 'Critical', ar: 'حرج' },
      essential: { en: 'Essential', ar: 'أساسي' },
      non_essential: { en: 'Non-Essential', ar: 'غير أساسي' },
    };

    return (
      <Badge className={criticalityColors[criticality] || 'bg-muted'}>
        {language === 'ar' ? criticalityLabels[criticality]?.ar : criticalityLabels[criticality]?.en}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/assets')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{language === 'ar' ? asset.name_ar : asset.name}</h1>
            <p className="text-muted-foreground">{asset.code}</p>
          </div>
        </div>
        <AssetQRCode asset={asset} />
      </div>

      {/* Image Preview */}
      {(asset as any).image_url && (
        <Card>
          <CardContent className="p-6">
            <img 
              src={(asset as any).image_url} 
              alt={asset.name}
              className="w-full max-w-2xl mx-auto rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {language === 'ar' ? 'معلومات أساسية' : 'Basic Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الفئة' : 'Category'}</p>
                <p className="font-medium">{asset.category}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</p>
                {getStatusBadge(asset.status)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الأهمية' : 'Criticality'}</p>
                {getCriticalityBadge(asset.criticality)}
              </div>
              {asset.type && (
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'النوع' : 'Type'}</p>
                  <p className="font-medium">{asset.type}</p>
                </div>
              )}
              {asset.subcategory && (
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الفئة الفرعية' : 'Subcategory'}</p>
                  <p className="font-medium">{asset.subcategory}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Equipment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {language === 'ar' ? 'تفاصيل المعدات' : 'Equipment Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {asset.manufacturer && (
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الشركة المصنعة' : 'Manufacturer'}</p>
                  <p className="font-medium">{asset.manufacturer}</p>
                </div>
              )}
              {asset.model && (
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الموديل' : 'Model'}</p>
                  <p className="font-medium">{asset.model}</p>
                </div>
              )}
              {asset.serial_number && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الرقم التسلسلي' : 'Serial Number'}</p>
                  <p className="font-medium">{asset.serial_number}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {language === 'ar' ? 'الموقع' : 'Location'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {asset.building_name && (
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'المبنى' : 'Building'}</p>
                <p className="font-medium">{language === 'ar' ? asset.building_name_ar : asset.building_name}</p>
              </div>
            )}
            {asset.floor_name && (
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الطابق' : 'Floor'}</p>
                <p className="font-medium">{language === 'ar' ? asset.floor_name_ar : asset.floor_name}</p>
              </div>
            )}
            {asset.department_name && (
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'القسم' : 'Department'}</p>
                <p className="font-medium">{language === 'ar' ? asset.department_name_ar : asset.department_name}</p>
              </div>
            )}
            {asset.room_name && (
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الغرفة' : 'Room'}</p>
                <p className="font-medium">{language === 'ar' ? asset.room_name_ar : asset.room_name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {language === 'ar' ? 'المعلومات المالية' : 'Financial Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {asset.purchase_cost && (
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تكلفة الشراء' : 'Purchase Cost'}</p>
                <p className="font-medium">{asset.purchase_cost.toLocaleString()} {language === 'ar' ? 'ريال' : 'SAR'}</p>
              </div>
            )}
            {asset.depreciation_annual && (
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الإهلاك السنوي' : 'Annual Depreciation'}</p>
                <p className="font-medium">{asset.depreciation_annual.toLocaleString()} {language === 'ar' ? 'ريال' : 'SAR'}</p>
              </div>
            )}
            {asset.expected_lifespan_years && (
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'العمر الافتراضي' : 'Expected Lifespan'}</p>
                <p className="font-medium">{asset.expected_lifespan_years} {language === 'ar' ? 'سنة' : 'years'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {language === 'ar' ? 'التواريخ المهمة' : 'Important Dates'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {asset.purchase_date && (
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تاريخ الشراء' : 'Purchase Date'}</p>
                <p className="font-medium">{new Date(asset.purchase_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
              </div>
            )}
            {asset.installation_date && (
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تاريخ التركيب' : 'Installation Date'}</p>
                <p className="font-medium">{new Date(asset.installation_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
              </div>
            )}
            {asset.warranty_expiry && (
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'انتهاء الضمان' : 'Warranty Expiry'}</p>
                <p className="font-medium">{new Date(asset.warranty_expiry).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
              </div>
            )}
            {asset.warranty_provider && (
              <div>
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'مزود الضمان' : 'Warranty Provider'}</p>
                <p className="font-medium">{asset.warranty_provider}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Specifications */}
        {asset.specifications && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {language === 'ar' ? 'المواصفات الفنية' : 'Technical Specifications'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                {JSON.stringify(asset.specifications, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>

      {/* History Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'السجل والتاريخ' : 'History & Activity'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="work-orders">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="work-orders">
                <History className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'سجل أوامر العمل' : 'Work Order History'}
              </TabsTrigger>
              <TabsTrigger value="activity">
                <Activity className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'سجل النشاطات' : 'Activity Log'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="work-orders" className="space-y-4">
              {loadingHistory ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : workOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد أوامر عمل' : 'No work orders found'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الكود' : 'Code'}</TableHead>
                      <TableHead>{language === 'ar' ? 'نوع المشكلة' : 'Issue'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workOrders.map((wo) => (
                      <TableRow key={wo.id}>
                        <TableCell>{format(new Date(wo.reported_at), 'PPP')}</TableCell>
                        <TableCell className="font-mono">{wo.code}</TableCell>
                        <TableCell>{wo.issue_type}</TableCell>
                        <TableCell>
                          <Badge>{wo.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              {loadingHistory ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : activityLog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد أنشطة' : 'No activity found'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المسؤول' : 'Technician'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLog.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{format(new Date(log.timestamp), 'PPP p')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.type}</Badge>
                        </TableCell>
                        <TableCell>{log.description || log.reason}</TableCell>
                        <TableCell>{log.technician_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
