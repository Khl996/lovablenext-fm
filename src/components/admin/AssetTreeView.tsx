import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown, ChevronRight, Package, Building2, Layers, Home, DoorOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Asset {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  category: string;
  status: string;
  criticality: string;
  building_id?: string;
  floor_id?: string;
  department_id?: string;
  room_id?: string;
  parent_asset_id?: string;
}

interface AssetTreeViewProps {
  assets: Asset[];
  onEdit?: (asset: Asset) => void;
  canManage: boolean;
}

interface LocationNode {
  id: string;
  name: string;
  name_ar: string;
  type: 'building' | 'floor' | 'department' | 'room';
  children: LocationNode[];
  assets: Asset[];
}

export function AssetTreeView({ assets, onEdit, canManage }: AssetTreeViewProps) {
  const { language } = useLanguage();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [locationTree, setLocationTree] = useState<LocationNode[]>([]);

  useEffect(() => {
    buildLocationTree();
  }, [assets]);

  const buildLocationTree = async () => {
    setLoading(true);
    try {
      // Get unique building IDs from assets
      const buildingIds = [...new Set(assets.map(a => a.building_id).filter(Boolean))];
      
      if (buildingIds.length === 0) {
        setLocationTree([]);
        return;
      }

      // Fetch buildings
      const { data: buildings } = await supabase
        .from('buildings')
        .select('id, name, name_ar')
        .in('id', buildingIds);

      if (!buildings) return;

      const tree: LocationNode[] = [];

      for (const building of buildings) {
        const buildingNode: LocationNode = {
          id: building.id,
          name: building.name,
          name_ar: building.name_ar,
          type: 'building',
          children: [],
          assets: assets.filter(a => a.building_id === building.id && !a.department_id && !a.floor_id),
        };

        // Get floors for this building
        const floorIds = [...new Set(assets.filter(a => a.building_id === building.id && a.floor_id).map(a => a.floor_id))];
        
        if (floorIds.length > 0) {
          const { data: floors } = await supabase
            .from('floors')
            .select('id, name, name_ar')
            .in('id', floorIds);

          if (floors) {
            for (const floor of floors) {
              const floorNode: LocationNode = {
                id: floor.id,
                name: floor.name,
                name_ar: floor.name_ar,
                type: 'floor',
                children: [],
                assets: assets.filter(a => a.floor_id === floor.id && !a.department_id),
              };

              // Get departments for this floor
              const deptIds = [...new Set(assets.filter(a => a.floor_id === floor.id && a.department_id).map(a => a.department_id))];
              
              if (deptIds.length > 0) {
                const { data: departments } = await supabase
                  .from('departments')
                  .select('id, name, name_ar')
                  .in('id', deptIds);

                if (departments) {
                  for (const dept of departments) {
                    const deptNode: LocationNode = {
                      id: dept.id,
                      name: dept.name,
                      name_ar: dept.name_ar,
                      type: 'department',
                      children: [],
                      assets: assets.filter(a => a.department_id === dept.id && !a.room_id),
                    };

                    // Get rooms for this department
                    const roomIds = [...new Set(assets.filter(a => a.department_id === dept.id && a.room_id).map(a => a.room_id))];
                    
                    if (roomIds.length > 0) {
                      const { data: rooms } = await supabase
                        .from('rooms')
                        .select('id, name, name_ar')
                        .in('id', roomIds);

                      if (rooms) {
                        for (const room of rooms) {
                          const roomNode: LocationNode = {
                            id: room.id,
                            name: room.name,
                            name_ar: room.name_ar,
                            type: 'room',
                            children: [],
                            assets: assets.filter(a => a.room_id === room.id),
                          };
                          deptNode.children.push(roomNode);
                        }
                      }
                    }

                    floorNode.children.push(deptNode);
                  }
                }
              }

              buildingNode.children.push(floorNode);
            }
          }
        }

        tree.push(buildingNode);
      }

      setLocationTree(tree);
    } catch (error) {
      console.error('Error building location tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      maintenance: 'secondary',
      retired: 'outline',
      inactive: 'destructive',
    };
    
    const statusMap: Record<string, string> = {
      active: language === 'ar' ? 'نشط' : 'Active',
      maintenance: language === 'ar' ? 'صيانة' : 'Maintenance',
      retired: language === 'ar' ? 'متقاعد' : 'Retired',
      inactive: language === 'ar' ? 'غير نشط' : 'Inactive',
    };

    return (
      <Badge variant={variants[status] || 'default'} className="text-xs">
        {statusMap[status] || status}
      </Badge>
    );
  };

  const getLocationIcon = (type: LocationNode['type']) => {
    switch (type) {
      case 'building':
        return <Building2 className="h-4 w-4 text-primary" />;
      case 'floor':
        return <Layers className="h-4 w-4 text-accent" />;
      case 'department':
        return <Home className="h-4 w-4 text-info" />;
      case 'room':
        return <DoorOpen className="h-4 w-4 text-warning" />;
    }
  };

  const renderAsset = (asset: Asset, level: number) => {
    return (
      <div
        key={asset.id}
        className={cn(
          "flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-md transition-colors",
          "border-l-2 border-transparent hover:border-primary/50"
        )}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
      >
        <div className="w-6" />
        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {language === 'ar' ? asset.name_ar : asset.name}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {asset.code}
            </span>
            {getStatusBadge(asset.status)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {asset.category}
          </div>
        </div>

        {canManage && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(asset)}
            className="shrink-0"
          >
            <span className="text-xs">{language === 'ar' ? 'تعديل' : 'Edit'}</span>
          </Button>
        )}
      </div>
    );
  };

  const renderLocationNode = (node: LocationNode, level: number = 0) => {
    const hasChildren = node.children.length > 0 || node.assets.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const nodeKey = `${node.type}-${node.id}`;

    return (
      <div key={nodeKey} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 py-2.5 px-3 hover:bg-muted/70 rounded-md transition-colors cursor-pointer",
            "border-l-2 border-transparent hover:border-primary/70",
            isExpanded && "bg-muted/50"
          )}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
          onClick={() => toggleNode(node.id)}
        >
          {hasChildren ? (
            <button className="p-1 hover:bg-background rounded transition-colors">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {getLocationIcon(node.type)}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {language === 'ar' ? node.name_ar : node.name}
              </span>
              <Badge variant="outline" className="text-xs">
                {node.assets.length} {language === 'ar' ? 'أصل' : 'assets'}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {language === 'ar' 
                ? node.type === 'building' ? 'مبنى' 
                  : node.type === 'floor' ? 'طابق'
                  : node.type === 'department' ? 'قسم'
                  : 'غرفة'
                : node.type}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-1">
            {node.assets.map(asset => renderAsset(asset, level + 1))}
            {node.children.map(child => renderLocationNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (locationTree.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-1">
      {locationTree.map(node => renderLocationNode(node))}
    </div>
  );
}