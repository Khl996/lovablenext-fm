import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTenant } from '@/contexts/TenantContext';

interface CustomField {
  id: string;
  entity_type: string;
  field_code: string;
  field_name: string;
  field_name_ar: string;
  field_type: string;
  field_options: any;
  default_value: string;
  is_required: boolean;
  is_searchable: boolean;
  display_order: number;
  help_text: string;
  help_text_ar: string;
  is_active: boolean;
}

const ENTITY_TYPES = [
  { value: 'asset', label: 'Assets', label_ar: 'الأصول' },
  { value: 'work_order', label: 'Work Orders', label_ar: 'أوامر العمل' },
  { value: 'maintenance_task', label: 'Maintenance Tasks', label_ar: 'مهام الصيانة' },
  { value: 'inventory_item', label: 'Inventory Items', label_ar: 'عناصر المخزون' },
  { value: 'contract', label: 'Contracts', label_ar: 'العقود' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text', label_ar: 'نص' },
  { value: 'textarea', label: 'Text Area', label_ar: 'نص طويل' },
  { value: 'number', label: 'Number', label_ar: 'رقم' },
  { value: 'date', label: 'Date', label_ar: 'تاريخ' },
  { value: 'datetime', label: 'Date Time', label_ar: 'تاريخ ووقت' },
  { value: 'select', label: 'Select', label_ar: 'اختيار' },
  { value: 'multiselect', label: 'Multi Select', label_ar: 'اختيار متعدد' },
  { value: 'checkbox', label: 'Checkbox', label_ar: 'مربع اختيار' },
  { value: 'radio', label: 'Radio', label_ar: 'اختيار واحد' },
  { value: 'email', label: 'Email', label_ar: 'بريد إلكتروني' },
  { value: 'phone', label: 'Phone', label_ar: 'هاتف' },
  { value: 'url', label: 'URL', label_ar: 'رابط' },
];

export default function CustomFieldsManagement() {
  const { language } = useLanguage();
  const { selectedTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEntityType, setSelectedEntityType] = useState('asset');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [formData, setFormData] = useState<Partial<CustomField>>({
    entity_type: 'asset',
    field_type: 'text',
    is_required: false,
    is_searchable: false,
    is_active: true,
    display_order: 0,
  });

  const { data: customFields, isLoading } = useQuery({
    queryKey: ['custom-fields', selectedTenant, selectedEntityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_custom_fields')
        .select('*')
        .eq('entity_type', selectedEntityType)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as CustomField[];
    },
    enabled: !!selectedTenant,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CustomField>) => {
      const { error } = await supabase
        .from('tenant_custom_fields')
        .insert([data]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      toast({
        title: language === 'ar' ? 'تم الإنشاء' : 'Created',
        description: language === 'ar' ? 'تم إنشاء الحقل بنجاح' : 'Field created successfully',
      });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomField> }) => {
      const { error } = await supabase
        .from('tenant_custom_fields')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      toast({
        title: language === 'ar' ? 'تم التحديث' : 'Updated',
        description: language === 'ar' ? 'تم تحديث الحقل بنجاح' : 'Field updated successfully',
      });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenant_custom_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف الحقل بنجاح' : 'Field deleted successfully',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      entity_type: selectedEntityType,
      field_type: 'text',
      is_required: false,
      is_searchable: false,
      is_active: true,
      display_order: 0,
    });
    setEditingField(null);
  };

  const handleSubmit = () => {
    if (editingField) {
      updateMutation.mutate({ id: editingField.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (field: CustomField) => {
    setEditingField(field);
    setFormData(field);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'الحقول المخصصة' : 'Custom Fields'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'إضافة حقول مخصصة للكيانات المختلفة' : 'Add custom fields to different entities'}
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'حقل جديد' : 'New Field'}
        </Button>
      </div>

      <div className="flex gap-2">
        {ENTITY_TYPES.map((type) => (
          <Button
            key={type.value}
            variant={selectedEntityType === type.value ? 'default' : 'outline'}
            onClick={() => setSelectedEntityType(type.value)}
          >
            {language === 'ar' ? type.label_ar : type.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {language === 'ar' ? 'الحقول المخصصة لـ ' : 'Custom Fields for '}
            {language === 'ar'
              ? ENTITY_TYPES.find(t => t.value === selectedEntityType)?.label_ar
              : ENTITY_TYPES.find(t => t.value === selectedEntityType)?.label
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
          ) : customFields && customFields.length > 0 ? (
            <div className="space-y-4">
              {customFields.map((field) => (
                <div key={field.id} className="flex items-center justify-between border-b pb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {language === 'ar' ? field.field_name_ar : field.field_name}
                      </h3>
                      <Badge variant="outline">
                        {FIELD_TYPES.find(t => t.value === field.field_type)?.[language === 'ar' ? 'label_ar' : 'label']}
                      </Badge>
                      {field.is_required && (
                        <Badge variant="destructive">{language === 'ar' ? 'إجباري' : 'Required'}</Badge>
                      )}
                      {!field.is_active && (
                        <Badge variant="secondary">{language === 'ar' ? 'غير نشط' : 'Inactive'}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'ar' ? field.help_text_ar : field.help_text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'ar' ? 'الكود' : 'Code'}: {field.field_code}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(field)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(field.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {language === 'ar' ? 'لا توجد حقول مخصصة' : 'No custom fields'}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingField
                ? (language === 'ar' ? 'تعديل الحقل' : 'Edit Field')
                : (language === 'ar' ? 'حقل مخصص جديد' : 'New Custom Field')
              }
            </DialogTitle>
            <DialogDescription>
              {language === 'ar'
                ? 'أضف حقلاً مخصصاً جديداً أو عدل حقلاً موجوداً'
                : 'Add a new custom field or edit an existing one'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}</Label>
                <Input
                  value={formData.field_name || ''}
                  onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}</Label>
                <Input
                  value={formData.field_name_ar || ''}
                  onChange={(e) => setFormData({ ...formData, field_name_ar: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الكود' : 'Code'}</Label>
              <Input
                value={formData.field_code || ''}
                onChange={(e) => setFormData({ ...formData, field_code: e.target.value })}
                placeholder="field_code"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'نوع الكيان' : 'Entity Type'}</Label>
                <Select
                  value={formData.entity_type}
                  onValueChange={(value) => setFormData({ ...formData, entity_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {language === 'ar' ? type.label_ar : type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'نوع الحقل' : 'Field Type'}</Label>
                <Select
                  value={formData.field_type}
                  onValueChange={(value) => setFormData({ ...formData, field_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {language === 'ar' ? type.label_ar : type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'النص المساعد (إنجليزي)' : 'Help Text (English)'}</Label>
                <Textarea
                  value={formData.help_text || ''}
                  onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'النص المساعد (عربي)' : 'Help Text (Arabic)'}</Label>
                <Textarea
                  value={formData.help_text_ar || ''}
                  onChange={(e) => setFormData({ ...formData, help_text_ar: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{language === 'ar' ? 'حقل إجباري' : 'Required Field'}</Label>
                <Switch
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>{language === 'ar' ? 'قابل للبحث' : 'Searchable'}</Label>
                <Switch
                  checked={formData.is_searchable}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_searchable: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>{language === 'ar' ? 'نشط' : 'Active'}</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ترتيب العرض' : 'Display Order'}</Label>
              <Input
                type="number"
                value={formData.display_order || 0}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
