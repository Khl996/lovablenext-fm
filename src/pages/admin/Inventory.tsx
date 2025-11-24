import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  TrendingDown,
  Edit,
  History,
  FileSpreadsheet,
  Clock
} from 'lucide-react';
import { InventoryItemDialog } from '@/components/inventory/InventoryItemDialog';
import { InventoryTransactionDialog } from '@/components/inventory/InventoryTransactionDialog';
import { InventoryTransactionHistoryDialog } from '@/components/inventory/InventoryTransactionHistoryDialog';
import type { Database } from '@/integrations/supabase/types';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];

export default function Inventory() {
  const { language, t } = useLanguage();
  const { permissions, hospitalId, loading: userLoading } = useCurrentUser();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const canView = permissions.hasPermission('inventory.view', hospitalId);
  const canManage = permissions.hasPermission('inventory.manage', hospitalId);
  const canTransact = permissions.hasPermission('inventory.transactions', hospitalId);

  useEffect(() => {
    if (!userLoading && canView) {
      loadItems();
    }
  }, [userLoading, canView, hospitalId]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('hospital_id', hospitalId!)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error loading inventory:', error);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setSelectedItem(null);
    setIsItemDialogOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsItemDialogOpen(true);
  };

  const handleTransaction = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsTransactionDialogOpen(true);
  };

  const handleShowHistory = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsHistoryDialogOpen(true);
  };

  const handleExport = () => {
    try {
      const csvContent = [
        [
          language === 'ar' ? 'الكود' : 'Code',
          language === 'ar' ? 'الاسم' : 'Name',
          language === 'ar' ? 'الكمية الحالية' : 'Current Qty',
          language === 'ar' ? 'الوحدة' : 'Unit',
          language === 'ar' ? 'سعر الوحدة' : 'Unit Cost',
          language === 'ar' ? 'القيمة الإجمالية' : 'Total Value',
          language === 'ar' ? 'الموقع' : 'Location',
        ].join(','),
        ...filteredItems.map((item) =>
          [
            item.code,
            language === 'ar' ? item.name_ar : item.name,
            item.current_quantity,
            language === 'ar' ? item.unit_of_measure_ar : item.unit_of_measure,
            item.unit_cost || 0,
            (item.current_quantity * (item.unit_cost || 0)).toFixed(2),
            language === 'ar' ? item.location_ar || '' : item.location || '',
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success(language === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error(language === 'ar' ? 'فشل التصدير' : 'Export failed');
    }
  };

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.name_ar.includes(searchQuery) ||
      item.code.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  });

  const lowStockItems = items.filter(
    (item) => item.current_quantity <= (item.min_quantity || 0)
  );

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'ليس لديك صلاحية للوصول إلى المخزون' 
                : 'You do not have permission to access inventory'}
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
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            {language === 'ar' ? 'إدارة المخزون' : 'Inventory Management'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'إدارة قطع الغيار والمواد الاستهلاكية' 
              : 'Manage spare parts and consumable materials'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {language === 'ar' ? 'تصدير' : 'Export'}
          </Button>
          {canManage && (
            <Button onClick={handleAddItem} className="gap-2">
              <Plus className="h-4 w-4" />
              {language === 'ar' ? 'إضافة صنف' : 'Add Item'}
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي الأصناف' : 'Total Items'}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'أصناف منخفضة المخزون' : 'Low Stock Items'}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {lowStockItems.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي القيمة' : 'Total Value'}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {items
                .reduce((sum, item) => sum + (item.current_quantity * (item.unit_cost || 0)), 0)
                .toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                  style: 'currency',
                  currency: 'SAR',
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'ar' ? 'بحث في المخزون...' : 'Search inventory...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {language === 'ar' ? 'تنبيه: أصناف منخفضة المخزون' : 'Alert: Low Stock Items'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((item) => (
                <Badge key={item.id} variant="destructive">
                  {language === 'ar' ? item.name_ar : item.name} ({item.current_quantity.toString()})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? language === 'ar'
                  ? 'لا توجد نتائج'
                  : 'No results found'
                : language === 'ar'
                ? 'لا توجد أصناف في المخزون'
                : 'No inventory items'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16"></TableHead>
                    <TableHead>{language === 'ar' ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead className="text-center">
                      {language === 'ar' ? 'الكمية الحالية' : 'Current Qty'}
                    </TableHead>
                    <TableHead className="text-center">
                      {language === 'ar' ? 'الحد الأدنى' : 'Min Qty'}
                    </TableHead>
                    <TableHead>{language === 'ar' ? 'الوحدة' : 'Unit'}</TableHead>
                    <TableHead className="text-end">
                      {language === 'ar' ? 'سعر الوحدة' : 'Unit Cost'}
                    </TableHead>
                    <TableHead>{language === 'ar' ? 'الموقع' : 'Location'}</TableHead>
                    <TableHead className="text-center">
                      {language === 'ar' ? 'الحالة' : 'Status'}
                    </TableHead>
                    <TableHead className="text-center">
                      {language === 'ar' ? 'إجراءات' : 'Actions'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isLowStock = item.current_quantity <= (item.min_quantity || 0);
                    return (
                      <TableRow key={item.id} className={isLowStock ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{item.code}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {language === 'ar' ? item.name_ar : item.name}
                            </div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={isLowStock ? 'text-destructive font-semibold' : ''}>
                            {item.current_quantity.toString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.min_quantity?.toString() || '-'}
                        </TableCell>
                        <TableCell>
                          {language === 'ar' ? item.unit_of_measure_ar : item.unit_of_measure}
                        </TableCell>
                        <TableCell className="text-end">
                          {item.unit_cost
                            ? item.unit_cost.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                                style: 'currency',
                                currency: 'SAR',
                              })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {language === 'ar' ? item.location_ar : item.location}
                        </TableCell>
                        <TableCell className="text-center">
                          {isLowStock && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {language === 'ar' ? 'منخفض' : 'Low'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowHistory(item)}
                              title={language === 'ar' ? 'سجل الحركات' : 'Transaction History'}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                            {canTransact && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTransaction(item)}
                                title={language === 'ar' ? 'إضافة حركة' : 'Add Transaction'}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            )}
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditItem(item)}
                                title={language === 'ar' ? 'تعديل' : 'Edit'}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {canManage && (
        <InventoryItemDialog
          open={isItemDialogOpen}
          onOpenChange={setIsItemDialogOpen}
          item={selectedItem}
          onSuccess={loadItems}
        />
      )}

      {canTransact && selectedItem && (
        <InventoryTransactionDialog
          open={isTransactionDialogOpen}
          onOpenChange={setIsTransactionDialogOpen}
          item={selectedItem}
          onSuccess={loadItems}
        />
      )}

      {selectedItem && (
        <InventoryTransactionHistoryDialog
          open={isHistoryDialogOpen}
          onOpenChange={setIsHistoryDialogOpen}
          item={selectedItem}
        />
      )}
    </div>
  );
}
