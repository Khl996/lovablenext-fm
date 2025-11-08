import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown, ChevronRight, Package, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Asset {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  category: string;
  status: string;
  criticality: string;
  parent_asset_id?: string;
}

interface AssetTreeViewProps {
  assets: Asset[];
  onEdit?: (asset: Asset) => void;
  canManage: boolean;
}

interface TreeNode {
  asset: Asset;
  children: TreeNode[];
}

export function AssetTreeView({ assets, onEdit, canManage }: AssetTreeViewProps) {
  const { language } = useLanguage();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Build tree structure
  const buildTree = (assets: Asset[]): TreeNode[] => {
    const assetMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Create nodes
    assets.forEach(asset => {
      assetMap.set(asset.id, { asset, children: [] });
    });

    // Build hierarchy
    assets.forEach(asset => {
      const node = assetMap.get(asset.id);
      if (!node) return;

      if (asset.parent_asset_id && assetMap.has(asset.parent_asset_id)) {
        const parent = assetMap.get(asset.parent_asset_id);
        parent?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
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

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.asset.id);

    return (
      <div key={node.asset.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-md transition-colors",
            "border-l-2 border-transparent hover:border-primary/50"
          )}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.asset.id)}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {language === 'ar' ? node.asset.name_ar : node.asset.name}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {node.asset.code}
              </span>
              {getStatusBadge(node.asset.status)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {node.asset.category}
            </div>
          </div>

          {canManage && onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(node.asset)}
              className="shrink-0"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree(assets);

  if (tree.length === 0) {
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
      {tree.map(node => renderNode(node))}
    </div>
  );
}
