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
import { Plus, Search, Pencil, Package } from 'lucide-react';
import { LocationPicker, LocationValue } from '@/components/LocationPicker';
import { AssetFormDialog } from '@/components/admin/AssetFormDialog';

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
  const [locationFilter, setLocationFilter] = useState<LocationValue>({
    hospitalId: null,
    buildingId: null,
    floorId: null,
    departmentId: null,
    roomId: null,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const canManage = permissions.hasPermission('manage_assets');

  useEffect(() => {
    if (hospitalId) {
      loadAssets();
    }
  }, [hospitalId, statusFilter, locationFilter]);

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

  const filteredAssets = assets.filter(asset => {
    const searchLower = searchQuery.toLowerCase();
    return (
      asset.code.toLowerCase().includes(searchLower) ||
      asset.name.toLowerCase().includes(searchLower) ||
      asset.name_ar.toLowerCase().includes(searchLower) ||
      (asset.manufacturer?.toLowerCase().includes(searchLower) || false) ||
      (asset.model?.toLowerCase().includes(searchLower) || false)
    );
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

      {/* Filters */}
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
      </div>

      {/* Location Filter */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">{t('filterByLocation')}</h3>
        <LocationPicker
          value={locationFilter}
          onChange={setLocationFilter}
          showHospital={false}
          required={false}
        />
      </div>

      {/* Assets Table */}
      <div className="border rounded-lg">
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
                {canManage && <TableHead>{t('actions')}</TableHead>}
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
                  {canManage && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAsset(asset)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Asset Form Dialog */}
      <AssetFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        asset={editingAsset}
        onSaved={handleAssetSaved}
      />
    </div>
  );
}
