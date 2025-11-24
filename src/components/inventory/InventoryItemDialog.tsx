import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];

interface InventoryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onSuccess: () => void;
}

export function InventoryItemDialog({ 
  open, 
  onOpenChange, 
  item, 
  onSuccess 
}: InventoryItemDialogProps) {
  const { language, t } = useLanguage();
  const { hospitalId } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    description: '',
    unit_of_measure: '',
    unit_of_measure_ar: '',
    current_quantity: '0',
    min_quantity: '0',
    max_quantity: '',
    unit_cost: '',
    location: '',
    location_ar: '',
    supplier: '',
    supplier_contact: '',
    barcode: '',
    notes: '',
  });

  useEffect(() => {
    if (item) {
      setFormData({
        code: item.code,
        name: item.name,
        name_ar: item.name_ar,
        description: item.description || '',
        unit_of_measure: item.unit_of_measure,
        unit_of_measure_ar: item.unit_of_measure_ar,
        current_quantity: item.current_quantity.toString(),
        min_quantity: item.min_quantity?.toString() || '0',
        max_quantity: item.max_quantity?.toString() || '',
        unit_cost: item.unit_cost?.toString() || '',
        location: item.location || '',
        location_ar: item.location_ar || '',
        supplier: item.supplier || '',
        supplier_contact: item.supplier_contact || '',
        barcode: item.barcode || '',
        notes: item.notes || '',
      });
      setImagePreview(item.image_url || null);
      setImageFile(null);
    } else {
      setFormData({
        code: '',
        name: '',
        name_ar: '',
        description: '',
        unit_of_measure: '',
        unit_of_measure_ar: '',
        current_quantity: '0',
        min_quantity: '0',
        max_quantity: '',
        unit_cost: '',
        location: '',
        location_ar: '',
        supplier: '',
        supplier_contact: '',
        barcode: '',
        notes: '',
      });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [item, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error(language === 'ar' ? 'يرجى اختيار صورة' : 'Please select an image');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(language === 'ar' ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت' : 'Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      setUploading(true);
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${hospitalId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('inventory-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('inventory-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(language === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name || !formData.name_ar || !formData.unit_of_measure || !formData.unit_of_measure_ar) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    try {
      setSaving(true);

      let imageUrl = item?.image_url || null;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const dataToSave = {
        hospital_id: hospitalId!,
        code: formData.code,
        name: formData.name,
        name_ar: formData.name_ar,
        description: formData.description || null,
        unit_of_measure: formData.unit_of_measure,
        unit_of_measure_ar: formData.unit_of_measure_ar,
        current_quantity: parseFloat(formData.current_quantity) || 0,
        min_quantity: formData.min_quantity ? parseFloat(formData.min_quantity) : 0,
        max_quantity: formData.max_quantity ? parseFloat(formData.max_quantity) : null,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
        location: formData.location || null,
        location_ar: formData.location_ar || null,
        supplier: formData.supplier || null,
        supplier_contact: formData.supplier_contact || null,
        barcode: formData.barcode || null,
        notes: formData.notes || null,
        image_url: imageUrl,
      };

      if (item) {
        const { error } = await supabase
          .from('inventory_items')
          .update(dataToSave)
          .eq('id', item.id);

        if (error) throw error;
        toast.success(language === 'ar' ? 'تم تحديث الصنف بنجاح' : 'Item updated successfully');
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert([dataToSave]);

        if (error) throw error;
        toast.success(language === 'ar' ? 'تم إضافة الصنف بنجاح' : 'Item added successfully');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving item:', error);
      toast.error(error.message || t('errorOccurred'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item
              ? language === 'ar' ? 'تعديل الصنف' : 'Edit Item'
              : language === 'ar' ? 'إضافة صنف جديد' : 'Add New Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                {language === 'ar' ? 'الكود' : 'Code'} *
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                disabled={!!item}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">{language === 'ar' ? 'الباركود' : 'Barcode'}</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {language === 'ar' ? 'الاسم (English)' : 'Name (English)'} *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_ar">
                {language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} *
              </Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                dir="rtl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{language === 'ar' ? 'الوصف' : 'Description'}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_of_measure">
                {language === 'ar' ? 'الوحدة (English)' : 'Unit (English)'} *
              </Label>
              <Input
                id="unit_of_measure"
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                placeholder="piece, meter, liter, kg"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_of_measure_ar">
                {language === 'ar' ? 'الوحدة (عربي)' : 'Unit (Arabic)'} *
              </Label>
              <Input
                id="unit_of_measure_ar"
                value={formData.unit_of_measure_ar}
                onChange={(e) => setFormData({ ...formData, unit_of_measure_ar: e.target.value })}
                placeholder="قطعة، متر، لتر، كجم"
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_quantity">
                {language === 'ar' ? 'الكمية الحالية' : 'Current Qty'} *
              </Label>
              <Input
                id="current_quantity"
                type="number"
                step="0.01"
                value={formData.current_quantity}
                onChange={(e) => setFormData({ ...formData, current_quantity: e.target.value })}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_quantity">
                {language === 'ar' ? 'الحد الأدنى' : 'Min Qty'}
              </Label>
              <Input
                id="min_quantity"
                type="number"
                step="0.01"
                value={formData.min_quantity}
                onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_quantity">
                {language === 'ar' ? 'الحد الأقصى' : 'Max Qty'}
              </Label>
              <Input
                id="max_quantity"
                type="number"
                step="0.01"
                value={formData.max_quantity}
                onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_cost">
                {language === 'ar' ? 'سعر الوحدة' : 'Unit Cost'}
              </Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">
                {language === 'ar' ? 'الموقع (English)' : 'Location (English)'}
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_ar">
                {language === 'ar' ? 'الموقع (عربي)' : 'Location (Arabic)'}
              </Label>
              <Input
                id="location_ar"
                value={formData.location_ar}
                onChange={(e) => setFormData({ ...formData, location_ar: e.target.value })}
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">{language === 'ar' ? 'المورد' : 'Supplier'}</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_contact">
                {language === 'ar' ? 'تواصل المورد' : 'Supplier Contact'}
              </Label>
              <Input
                id="supplier_contact"
                value={formData.supplier_contact}
                onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })}
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'صورة الصنف' : 'Item Image'}</Label>
            <div className="flex items-center gap-4">
              {imagePreview && (
                <div className="relative w-24 h-24 rounded-md overflow-hidden border">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => {
                      setImagePreview(null);
                      setImageFile(null);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div>
                <Input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('image')?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {language === 'ar' ? 'اختر صورة' : 'Choose Image'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'PNG, JPG أقل من 5 ميجابايت' : 'PNG, JPG up to 5MB'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving || uploading
                ? language === 'ar' ? 'جاري الحفظ...' : 'Saving...'
                : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
