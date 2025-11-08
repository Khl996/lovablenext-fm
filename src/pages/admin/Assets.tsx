import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Pencil, Package, Trash2, List, Network } from 'lucide-react';
import { LocationPicker, LocationValue } from '@/components/LocationPicker';
import { AssetFormDialog } from '@/components/admin/AssetFormDialog';
import { AssetTreeView } from '@/components/admin/AssetTreeView';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface Asset {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  hospital_id: string;
  category: string;
  status: string;
  criticality: string;
  building_id?: string;
  floor_id?: string;
  department_id?: string;
  room_id?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  installation_date?: string;
}

export default function Assets() {
  const { t, language } = useLanguage();
  const { hospitalId, permissions } = useCurrentUser();
  const { toast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'maintenance' | 'inactive' | 'retired'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState<LocationValue>({
    hospitalId: null,
    buildingId: null,
    floorId: null,
    departmentId: null,
    roomId: null,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');

  const canManage = permissions.hasPermission('manage_assets');
  const canDelete = permissions.hasPermission('delete_assets') || canManage;

  useEffect(() => {
    if (hospitalId) {
      loadAssets();
    }
  }, [hospitalId, statusFilter, categoryFilter, locationFilter]);

  const loadAssets = async () => {
    if (!hospitalId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('assets')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter as any);
      }

      if (locationFilter.buildingId) {
        query = query.eq('building_id', locationFilter.buildingId);
      }
      if (locationFilter.floorId) {
        query = query.eq('floor_id', locationFilter.floorId);
      }
      if (locationFilter.departmentId) {
        query = query.eq('department_id', locationFilter.departmentId);
      }
      if (locationFilter.roomId) {
        query = query.eq('room_id', locationFilter.roomId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error('Error loading assets:', error);
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = () => {
    setEditingAsset(null);
    setDialogOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setDialogOpen(true);
  };

  const handleAssetSaved = () => {
    loadAssets();
    setDialogOpen(false);
    setEditingAsset(null);
  };

  const handleDeleteClick = (asset: Asset) => {
    setAssetToDelete(asset);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return;

    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetToDelete.id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted Successfully',
        description: language === 'ar' 
          ? 'تم حذف الأصل بنجاح' 
          : 'Asset deleted successfully',
      });

      loadAssets();
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setAssetToDelete(null);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setManufacturerFilter('');
    setSupplierFilter('');
    setLocationFilter({
      hospitalId: null,
      buildingId: null,
      floorId: null,
      departmentId: null,
      roomId: null,
    });
  };

  const filteredAssets = assets.filter(asset => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      asset.code.toLowerCase().includes(searchLower) ||
      asset.name.toLowerCase().includes(searchLower) ||
      asset.name_ar.toLowerCase().includes(searchLower) ||
      (asset.manufacturer?.toLowerCase().includes(searchLower) || false) ||
      (asset.model?.toLowerCase().includes(searchLower) || false) ||
      (asset.serial_number?.toLowerCase().includes(searchLower) || false)
    );

    const matchesManufacturer = !manufacturerFilter || 
      (asset.manufacturer?.toLowerCase().includes(manufacturerFilter.toLowerCase()) || false);
    
    const matchesSupplier = !supplierFilter || 
      ((asset as any).supplier?.toLowerCase().includes(supplierFilter.toLowerCase()) || false);

    return matchesSearch && matchesManufacturer && matchesSupplier;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      maintenance: 'secondary',
      retired: 'outline',
      inactive: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {language === 'ar' ? getStatusArabic(status) : status}
      </Badge>
    );
  };

  const getCriticalityBadge = (criticality: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      essential: 'destructive',
      critical: 'default',
      non_essential: 'secondary',
    };
    return (
      <Badge variant={variants[criticality] || 'default'}>
        {language === 'ar' ? getCriticalityArabic(criticality) : criticality}
      </Badge>
    );
  };

  const getStatusArabic = (status: string) => {
    const statusMap: Record<string, string> = {
      active: 'نشط',
      maintenance: 'صيانة',
      retired: 'متقاعد',
      inactive: 'غير نشط',
    };
    return statusMap[status] || status;
  };

  const getCriticalityArabic = (criticality: string) => {
    const criticalityMap: Record<string, string> = {
      essential: 'أساسي',
      critical: 'حرج',
      non_essential: 'غير أساسي',
    };
    return criticalityMap[criticality] || criticality;
  };

  if (!permissions.hasPermission('view_assets')) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('accessDenied')}</h3>
          <p className="text-muted-foreground">{t('noPermission')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('assets')}</h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'إدارة أصول المستشفى والمعدات الطبية'
              : 'Manage hospital assets and medical equipment'}
          </p>
        </div>
        {canManage && (
          <Button onClick={handleAddAsset}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addAsset')}
          </Button>
        )}
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
            <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
            <SelectItem value="maintenance">{language === 'ar' ? 'صيانة' : 'Maintenance'}</SelectItem>
            <SelectItem value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</SelectItem>
            <SelectItem value="retired">{language === 'ar' ? 'متقاعد' : 'Retired'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder={language === 'ar' ? 'جميع الفئات' : 'All Categories'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'ar' ? 'جميع الفئات' : 'All Categories'}</SelectItem>
            <SelectItem value="medical_equipment">{language === 'ar' ? 'معدات طبية' : 'Medical Equipment'}</SelectItem>
            <SelectItem value="hvac">{language === 'ar' ? 'تكييف وتهوية' : 'HVAC'}</SelectItem>
            <SelectItem value="electrical">{language === 'ar' ? 'كهربائي' : 'Electrical'}</SelectItem>
            <SelectItem value="plumbing">{language === 'ar' ? 'سباكة' : 'Plumbing'}</SelectItem>
            <SelectItem value="fire_safety">{language === 'ar' ? 'السلامة من الحريق' : 'Fire Safety'}</SelectItem>
            <SelectItem value="it_equipment">{language === 'ar' ? 'معدات تقنية' : 'IT Equipment'}</SelectItem>
            <SelectItem value="furniture">{language === 'ar' ? 'أثاث' : 'Furniture'}</SelectItem>
            <SelectItem value="other">{language === 'ar' ? 'أخرى' : 'Other'}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={resetFilters}>
          {language === 'ar' ? 'إعادة تعيين' : 'Reset Filters'}
        </Button>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <div className="border rounded-lg">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4">
              <span className="font-semibold">
                {language === 'ar' ? 'فلاتر متقدمة' : 'Advanced Filters'}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'ar' ? 'الشركة المصنعة' : 'Manufacturer'}
                </label>
                <Input
                  placeholder={language === 'ar' ? 'ابحث عن الشركة المصنعة' : 'Search manufacturer'}
                  value={manufacturerFilter}
                  onChange={(e) => setManufacturerFilter(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'ar' ? 'المورد' : 'Supplier'}
                </label>
                <Input
                  placeholder={language === 'ar' ? 'ابحث عن المورد' : 'Search supplier'}
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">{t('filterByLocation')}</h3>
              <LocationPicker
                value={locationFilter}
                onChange={setLocationFilter}
                showHospital={false}
                required={false}
              />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* View Toggle and Content */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'tree')} className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">
            <List className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'عرض جدولي' : 'Table View'}
          </TabsTrigger>
          <TabsTrigger value="tree">
            <Network className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'عرض شجري' : 'Tree View'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="border rounded-lg">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {language === 'ar' ? 'لا توجد أصول' : 'No Assets Found'}
            </h3>
            <p className="text-muted-foreground">
              {language === 'ar'
                ? 'لم يتم العثور على أصول. قم بإضافة أصل جديد للبدء.'
                : 'No assets found. Add a new asset to get started.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('code')}</TableHead>
                <TableHead>{t('assetName')}</TableHead>
                <TableHead>{t('category')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('criticality')}</TableHead>
                <TableHead>{language === 'ar' ? 'الشركة المصنعة' : 'Manufacturer'}</TableHead>
                <TableHead>{language === 'ar' ? 'الطراز' : 'Model'}</TableHead>
                {(canManage || canDelete) && <TableHead>{t('actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.code}</TableCell>
                  <TableCell>{language === 'ar' ? asset.name_ar : asset.name}</TableCell>
                  <TableCell>{asset.category}</TableCell>
                  <TableCell>{getStatusBadge(asset.status)}</TableCell>
                  <TableCell>{getCriticalityBadge(asset.criticality)}</TableCell>
                  <TableCell>{asset.manufacturer || '-'}</TableCell>
                  <TableCell>{asset.model || '-'}</TableCell>
                  {(canManage || canDelete) && (
                    <TableCell>
                      <div className="flex gap-2">
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditAsset(asset)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(asset)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        </TabsContent>

        <TabsContent value="tree" className="border rounded-lg p-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <AssetTreeView
              assets={filteredAssets}
              onEdit={canManage ? handleEditAsset : undefined}
              canManage={canManage}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Asset Form Dialog */}
      <AssetFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        asset={editingAsset}
        onSaved={handleAssetSaved}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar'
                ? 'هل أنت متأكد من حذف هذا الأصل؟ لا يمكن التراجع عن هذه العملية.'
                : 'Are you sure you want to delete this asset? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
