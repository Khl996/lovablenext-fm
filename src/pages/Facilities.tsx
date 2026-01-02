import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Package, Wrench, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface FacilityData {
  building_id: string;
  building_name: string;
  building_name_ar: string;
  assets_count: number;
  critical_assets: number;
  active_work_orders: number;
}

export default function Facilities() {
  const { language } = useLanguage();
  const { hospitalId } = useCurrentUser();
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<FacilityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hospitalId) {
      loadFacilities();
    } else {
      setLoading(false);
    }
  }, [hospitalId]);

  const loadFacilities = async () => {
    if (!hospitalId) return;
    
    try {
      setLoading(true);
      
      // Get all buildings for the hospital
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name, name_ar')
        .eq('hospital_id', hospitalId);

      if (buildingsError) throw buildingsError;

      // For each building, get stats
      const facilitiesData: FacilityData[] = await Promise.all(
        (buildings || []).map(async (building) => {
          // Count assets in building
          const { count: assetsCount } = await supabase
            .from('assets')
            .select('*', { count: 'exact', head: true })
            .eq('building_id', building.id);

          // Count critical assets
          const { count: criticalCount } = await supabase
            .from('assets')
            .select('*', { count: 'exact', head: true })
            .eq('building_id', building.id)
            .eq('criticality', 'critical');

          // Count active work orders
          const { count: workOrdersCount } = await supabase
            .from('work_orders')
            .select('*', { count: 'exact', head: true })
            .eq('building_id', building.id)
            .in('status', ['pending', 'assigned', 'in_progress']);

          return {
            building_id: building.id,
            building_name: building.name,
            building_name_ar: building.name_ar,
            assets_count: assetsCount || 0,
            critical_assets: criticalCount || 0,
            active_work_orders: workOrdersCount || 0,
          };
        })
      );

      setFacilities(facilitiesData);
    } catch (error) {
      console.error('Error loading facilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuildingClick = (buildingId: string) => {
    // Navigate to assets filtered by building
    navigate(`/admin/assets?building=${buildingId}`);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'المرافق' : 'Facilities'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'عرض ومراقبة حالة المرافق والمباني' 
              : 'View and monitor facilities and buildings status'}
          </p>
        </div>
        <Button onClick={() => navigate('/admin/locations')}>
          {language === 'ar' ? 'إدارة المواقع' : 'Manage Locations'}
        </Button>
      </div>

      {facilities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {language === 'ar' ? 'لا توجد مرافق' : 'No Facilities'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {language === 'ar'
                ? 'لم يتم إضافة أي مباني بعد. أضف مباني لبدء إدارة المرافق.'
                : 'No buildings added yet. Add buildings to start managing facilities.'}
            </p>
            <Button onClick={() => navigate('/admin/locations')}>
              {language === 'ar' ? 'إضافة مبنى' : 'Add Building'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility) => (
            <Card 
              key={facility.building_id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleBuildingClick(facility.building_id)}
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/5 p-3 rounded-lg border border-border">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {language === 'ar' ? facility.building_name_ar : facility.building_name}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'الأصول' : 'Assets'}
                    </span>
                  </div>
                  <span className="font-semibold">{facility.assets_count}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">
                      {language === 'ar' ? 'أصول حرجة' : 'Critical Assets'}
                    </span>
                  </div>
                  <span className="font-semibold text-destructive">{facility.critical_assets}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-orange-500">
                      {language === 'ar' ? 'أوامر نشطة' : 'Active Orders'}
                    </span>
                  </div>
                  <span className="font-semibold text-orange-500">{facility.active_work_orders}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
