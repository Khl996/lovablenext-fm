import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, AlertCircle } from 'lucide-react';

interface BuildingHealth {
  id: string;
  name: string;
  name_ar: string;
  activeWorkOrders: number;
  status: 'healthy' | 'warning' | 'critical';
}

export function FacilityHealthOverview() {
  const { language } = useLanguage();
  const [buildings, setBuildings] = useState<BuildingHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBuildingHealth();
  }, []);

  const loadBuildingHealth = async () => {
    try {
      setLoading(true);

      // Fetch all buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name, name_ar')
        .order('name');

      if (buildingsError) throw buildingsError;

      // Fetch active work orders per building
      const { data: workOrders, error: ordersError } = await supabase
        .from('work_orders')
        .select('building_id')
        .in('status', ['pending', 'assigned', 'in_progress', 'pending_supervisor_approval', 'pending_engineer_review', 'pending_reporter_closure']);

      if (ordersError) throw ordersError;

      // Count work orders per building
      const orderCounts = workOrders?.reduce((acc, order) => {
        if (order.building_id) {
          acc[order.building_id] = (acc[order.building_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      // Map buildings to health status
      const buildingHealth: BuildingHealth[] = (buildingsData || []).map(building => {
        const activeWorkOrders = orderCounts[building.id] || 0;
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        
        if (activeWorkOrders >= 5) {
          status = 'critical';
        } else if (activeWorkOrders >= 3) {
          status = 'warning';
        }

        return {
          id: building.id,
          name: building.name,
          name_ar: building.name_ar,
          activeWorkOrders,
          status
        };
      });

      setBuildings(buildingHealth);
    } catch (error) {
      console.error('Error loading building health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-success/10 text-success border-success/20';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'critical':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'critical' || status === 'warning') {
      return <AlertCircle className="h-4 w-4" />;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          {language === 'ar' ? 'نظرة عامة على صحة المنشآت' : 'Facility Health Overview'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : buildings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {language === 'ar' ? 'لا توجد مباني' : 'No buildings found'}
          </div>
        ) : (
          <div className="space-y-3">
            {buildings.map(building => (
              <div
                key={building.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-3 h-3 rounded-full ${
                    building.status === 'healthy' ? 'bg-success' :
                    building.status === 'warning' ? 'bg-warning' :
                    'bg-destructive'
                  }`} />
                  <div>
                    <p className="font-medium">
                      {language === 'ar' ? building.name_ar : building.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {building.activeWorkOrders} {language === 'ar' ? 'أمر عمل نشط' : 'active work orders'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={getStatusColor(building.status)}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(building.status)}
                    {building.status === 'healthy' && (language === 'ar' ? 'سليم' : 'Healthy')}
                    {building.status === 'warning' && (language === 'ar' ? 'تحذير' : 'Warning')}
                    {building.status === 'critical' && (language === 'ar' ? 'حرج' : 'Critical')}
                  </span>
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
