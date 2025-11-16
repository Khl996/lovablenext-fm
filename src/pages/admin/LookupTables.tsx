import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Edit, Database, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LookupTableName, LookupItem, initializeDefaultLookups } from '@/hooks/useLookupTables';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';

const tableMap = {
  priorities: 'lookup_priorities',
  work_order_statuses: 'lookup_work_order_statuses',
  asset_statuses: 'lookup_asset_statuses',
  asset_categories: 'lookup_asset_categories',
  work_types: 'lookup_work_types',
  team_roles: 'lookup_team_roles',
} as const;

export default function LookupTables() {
  const { language } = useLanguage();
  const { hospitalId, permissions, loading: userLoading, isHospitalAdmin, isFacilityManager, isGlobalAdmin } = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user has permission to access settings
  useEffect(() => {
    // Don't check permissions while still loading
    if (userLoading || permissions.loading) return;
    
    if (!isHospitalAdmin && !isFacilityManager && !isGlobalAdmin) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar'
          ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة'
          : 'You do not have permission to access this page',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [isHospitalAdmin, isFacilityManager, isGlobalAdmin, userLoading, navigate, language, toast]);

  const [selectedTable, setSelectedTable] = useState<LookupTableName>('priorities');
  const [data, setData] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LookupItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<LookupItem | null>(null);
  const [initDialogOpen, setInitDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    description: '',
    color: '#3b82f6',
    level: 0,
    category: '',
    display_order: 0,
  });

  const tabs = [
    { value: 'priorities' as const, labelAr: 'الأولويات', labelEn: 'Priorities' },
    { value: 'work_order_statuses' as const, labelAr: 'حالات أوامر العمل', labelEn: 'Work Order Statuses' },
    { value: 'asset_statuses' as const, labelAr: 'حالات الأصول', labelEn: 'Asset Statuses' },
    { value: 'asset_categories' as const, labelAr: 'فئات الأصول', labelEn: 'Asset Categories' },
    { value: 'work_types' as const, labelAr: 'أنواع الأعمال', labelEn: 'Work Types' },
    { value: 'team_roles' as const, labelAr: 'أدوار الفريق', labelEn: 'Team Roles' },
  ];

  useEffect(() => {
    if (hospitalId) {
      loadData();
    }
  }, [hospitalId, selectedTable]);

  const loadData = async () => {
    if (!hospitalId) return;
    try {
      setLoading(true);
      const { data: items, error } = await supabase
        .from(tableMap[selectedTable] as any)
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setData((items as unknown as LookupItem[]) || []);
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

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      description: '',
      color: '#3b82f6',
      level: 0,
      category: '',
      display_order: data.length,
    });
    setDialogOpen(true);
  };

  const handleEdit = (item: LookupItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar,
      description: item.description || '',
      color: item.color || '#3b82f6',
      level: item.level || 0,
      category: item.category || '',
      display_order: item.display_order,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId) return;

    try {
      const payload: any = {
        code: formData.code,
        name: formData.name,
        name_ar: formData.name_ar,
        display_order: formData.display_order,
        is_active: true,
      };

      // Add optional fields based on table type
      if (['priorities', 'team_roles'].includes(selectedTable)) {
        payload.level = formData.level;
      }
      if (['priorities', 'work_order_statuses', 'asset_statuses'].includes(selectedTable)) {
        payload.color = formData.color;
      }
      if (['work_order_statuses', 'asset_statuses', 'asset_categories'].includes(selectedTable)) {
        if (formData.category) payload.category = formData.category;
      }
      if (formData.description) {
        payload.description = formData.description;
      }

      if (editingItem) {
        const { error } = await supabase
          .from(tableMap[selectedTable] as any)
          .update(payload)
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: language === 'ar' ? 'تم التحديث' : 'Updated',
          description: language === 'ar' ? 'تم تحديث العنصر بنجاح' : 'Item updated successfully',
        });
      } else {
        const { error } = await supabase
          .from(tableMap[selectedTable] as any)
          .insert({ ...payload, hospital_id: hospitalId });

        if (error) throw error;

        toast({
          title: language === 'ar' ? 'تم الإضافة' : 'Added',
          description: language === 'ar' ? 'تم إضافة العنصر بنجاح' : 'Item added successfully',
        });
      }

      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (item: LookupItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from(tableMap[selectedTable] as any)
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف العنصر بنجاح' : 'Item deleted successfully',
      });

      loadData();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleInitialize = async () => {
    if (!hospitalId) return;

    try {
      setLoading(true);
      await initializeDefaultLookups(hospitalId);
      
      toast({
        title: language === 'ar' ? 'تم التهيئة' : 'Initialized',
        description: language === 'ar' ? 'تم تهيئة البيانات الافتراضية بنجاح' : 'Default data initialized successfully',
      });

      loadData();
      setInitDialogOpen(false);
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            {language === 'ar' ? 'الجداول المرجعية' : 'Lookup Tables'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'إدارة القوائم والقيم المرجعية المستخدمة في النظام' 
              : 'Manage reference lists and values used throughout the system'}
          </p>
        </div>
        <Button onClick={() => setInitDialogOpen(true)} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'تهيئة البيانات الافتراضية' : 'Initialize Defaults'}
        </Button>
      </div>

      <Tabs value={selectedTable} onValueChange={(v) => setSelectedTable(v as LookupTableName)}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {language === 'ar' ? tab.labelAr : tab.labelEn}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {data.length} {language === 'ar' ? 'عنصر' : 'items'}
              </div>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إضافة عنصر' : 'Add Item'}
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'الرمز' : 'Code'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}</TableHead>
                    {['priorities', 'work_order_statuses', 'asset_statuses'].includes(selectedTable) && (
                      <TableHead>{language === 'ar' ? 'اللون' : 'Color'}</TableHead>
                    )}
                    {['work_order_statuses', 'asset_statuses'].includes(selectedTable) && (
                      <TableHead>{language === 'ar' ? 'الفئة' : 'Category'}</TableHead>
                    )}
                    <TableHead>{language === 'ar' ? 'الترتيب' : 'Order'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><Badge variant="outline">{item.code}</Badge></TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.name_ar}</TableCell>
                      {['priorities', 'work_order_statuses', 'asset_statuses'].includes(selectedTable) && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color || '#3b82f6' }} />
                            <span className="text-xs text-muted-foreground">{item.color}</span>
                          </div>
                        </TableCell>
                      )}
                      {['work_order_statuses', 'asset_statuses'].includes(selectedTable) && (
                        <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                      )}
                      <TableCell>{item.display_order}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteClick(item)} className="text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? (language === 'ar' ? 'تعديل عنصر' : 'Edit Item')
                : (language === 'ar' ? 'إضافة عنصر جديد' : 'Add New Item')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الرمز' : 'Code'} *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  disabled={!!editingItem}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الترتيب' : 'Display Order'}</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (English)' : 'Name (English)'} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} *</Label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                required
              />
            </div>

            {['priorities', 'work_order_statuses', 'asset_statuses'].includes(selectedTable) && (
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اللون' : 'Color'}</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
            )}

            {['work_order_statuses', 'asset_statuses'].includes(selectedTable) && (
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الفئة' : 'Category'} *</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder={selectedTable === 'work_order_statuses' ? 'open, in_progress, closed' : 'operational, maintenance, inactive'}
                  required
                />
              </div>
            )}

            {['priorities', 'team_roles'].includes(selectedTable) && (
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المستوى' : 'Level'}</Label>
                <Input
                  type="number"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit">{language === 'ar' ? 'حفظ' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar'
                ? 'هل أنت متأكد من حذف هذا العنصر؟ قد يؤثر ذلك على البيانات المرتبطة.'
                : 'Are you sure you want to delete this item? This may affect related data.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Initialize Defaults Dialog */}
      <AlertDialog open={initDialogOpen} onOpenChange={setInitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'تهيئة البيانات الافتراضية' : 'Initialize Default Data'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar'
                ? 'سيتم إضافة القيم الافتراضية لجميع الجداول المرجعية. هل تريد المتابعة؟'
                : 'This will add default values for all lookup tables. Do you want to continue?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleInitialize}>
              {language === 'ar' ? 'تهيئة' : 'Initialize'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}