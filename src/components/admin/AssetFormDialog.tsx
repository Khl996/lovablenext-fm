import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocationPicker, LocationValue } from '@/components/LocationPicker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Upload, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset | null;
  onSaved: () => void;
}

export function AssetFormDialog({ open, onOpenChange, asset, onSaved }: AssetFormDialogProps) {
  const { t, language } = useLanguage();
  const { hospitalId } = useCurrentUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [availableParentAssets, setAvailableParentAssets] = useState<any[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    parent_asset_id: '',
    category: 'medical',
    status: 'active',
    criticality: 'non_essential',
    manufacturer: '',
    model: '',
    serial_number: '',
    supplier: '',
    purchase_date: null as Date | null,
    installation_date: null as Date | null,
    warranty_expiry: null as Date | null,
    purchase_cost: '',
    image_url: '',
  });

  const [location, setLocation] = useState<LocationValue>({
    hospitalId: null,
    buildingId: null,
    floorId: null,
    departmentId: null,
    roomId: null,
  });

  // Generate asset code
  const generateAssetCode = async () => {
    if (!hospitalId) return '';

    try {
      // Get hospital code
      const { data: hospital } = await supabase
        .from('hospitals')
        .select('code')
        .eq('id', hospitalId)
        .single();

      const hospitalCode = hospital?.code || 'HOS';

      // Get category code if category is selected
      let categoryCode = 'AST';
      if (formData.category) {
        const { data: categories } = await supabase
          .from('lookup_asset_categories')
          .select('category_code')
          .eq('hospital_id', hospitalId)
          .eq('code', formData.category)
          .maybeSingle();
        
        categoryCode = categories?.category_code || formData.category.substring(0, 3).toUpperCase();
      }

      // Get count of assets with same hospital and category
      const { count } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId)
        .eq('category', formData.category as any);
      
      const nextNumber = (count || 0) + 1;
      return `${hospitalCode}-${categoryCode}-${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating code:', error);
      return `AST-${Date.now().toString().slice(-4)}`;
    }
  };

  // Load available parent assets
  const loadParentAssets = async () => {
    if (!hospitalId) return;

    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, code, name, name_ar')
        .eq('hospital_id', hospitalId)
        .order('name');

      if (error) throw error;
      setAvailableParentAssets(data || []);
    } catch (error) {
      console.error('Error loading parent assets:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadParentAssets();
      
      if (asset) {
        setFormData({
          name: asset.name,
          name_ar: asset.name_ar,
          parent_asset_id: (asset as any).parent_asset_id || '',
          category: asset.category,
          status: asset.status,
          criticality: asset.criticality,
          manufacturer: asset.manufacturer || '',
          model: asset.model || '',
          serial_number: asset.serial_number || '',
          supplier: (asset as any).supplier || '',
          purchase_date: asset.purchase_date ? new Date(asset.purchase_date) : null,
          installation_date: asset.installation_date ? new Date(asset.installation_date) : null,
          warranty_expiry: (asset as any).warranty_expiry ? new Date((asset as any).warranty_expiry) : null,
          purchase_cost: (asset as any).purchase_cost?.toString() || '',
          image_url: (asset as any).image_url || '',
        });
        setGeneratedCode(asset.code);
        setImagePreview((asset as any).image_url || null);
        setLocation({
          hospitalId: asset.hospital_id,
          buildingId: asset.building_id || null,
          floorId: asset.floor_id || null,
          departmentId: asset.department_id || null,
          roomId: asset.room_id || null,
        });
      } else {
        generateAssetCode().then(code => setGeneratedCode(code));
        setFormData({
          name: '',
          name_ar: '',
          parent_asset_id: '',
          category: 'medical',
          status: 'active',
          criticality: 'non_essential',
          manufacturer: '',
          model: '',
          serial_number: '',
          supplier: '',
          purchase_date: null,
          installation_date: null,
          warranty_expiry: null,
          purchase_cost: '',
          image_url: '',
        });
        setImageFile(null);
        setImagePreview(null);
        setLocation({
          hospitalId,
          buildingId: null,
          floorId: null,
          departmentId: null,
          roomId: null,
        });
      }
    }
  }, [open, asset, hospitalId]);

  // Regenerate code when category changes (only for new assets)
  useEffect(() => {
    if (open && !asset && formData.category) {
      generateAssetCode().then(code => setGeneratedCode(code));
    }
  }, [formData.category]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: '' });
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !hospitalId) return formData.image_url || null;

    setUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${hospitalId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('asset-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('asset-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hospitalId) return;

    setLoading(true);
    try {
      // Upload image first if there's a new one
      let imageUrl = formData.image_url;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const payload: any = {
        name: formData.name,
        name_ar: formData.name_ar,
        hospital_id: hospitalId,
        category: formData.category,
        status: formData.status,
        criticality: formData.criticality,
        building_id: location.buildingId || null,
        floor_id: location.floorId || null,
        department_id: location.departmentId || null,
        room_id: location.roomId || null,
        parent_asset_id: formData.parent_asset_id || null,
        manufacturer: formData.manufacturer || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        supplier: formData.supplier || null,
        purchase_date: formData.purchase_date ? format(formData.purchase_date, 'yyyy-MM-dd') : null,
        installation_date: formData.installation_date ? format(formData.installation_date, 'yyyy-MM-dd') : null,
        warranty_expiry: formData.warranty_expiry ? format(formData.warranty_expiry, 'yyyy-MM-dd') : null,
        purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
        image_url: imageUrl || null,
      };

      if (asset) {
        // Update QR code URL if code changed
        payload.qr_code = `${window.location.origin}/admin/assets/${asset.code}`;
        
        const { error } = await supabase
          .from('assets')
          .update(payload)
          .eq('id', asset.id);

        if (error) throw error;
      } else {
        payload.code = generatedCode;
        // Set QR code URL for new asset
        payload.qr_code = `${window.location.origin}/admin/assets/${generatedCode}`;
        
        const { error } = await supabase
          .from('assets')
          .insert([payload]);

        if (error) throw error;
      }

      toast({
        title: t('success'),
        description: asset 
          ? (language === 'ar' ? 'تم تحديث الأصل بنجاح' : 'Asset updated successfully')
          : (language === 'ar' ? 'تم إضافة الأصل بنجاح' : 'Asset added successfully'),
      });

      onSaved();
    } catch (error: any) {
      console.error('Error saving asset:', error);
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {asset ? t('editAsset') : t('addAsset')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-4">
            <h3 className="font-semibold">{language === 'ar' ? 'صورة الأصل' : 'Asset Image'}</h3>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Asset preview" 
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2"
                    onClick={handleImageRemove}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <p className="text-sm text-center">
                      {language === 'ar' ? 'اضغط لاختيار صورة' : 'Click to select image'}
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {language === 'ar' ? 'PNG, JPG حتى 5MB' : 'PNG, JPG up to 5MB'}
                    </p>
                  </div>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </Label>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">{t('basicInformation')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ar' ? 'الكود' : 'Asset Code'}</Label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm font-mono">
                  {asset ? asset.code : generatedCode || 'AST-0001'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'يتم إنشاؤه تلقائياً' : 'Auto-generated'}
                </p>
              </div>

              <div>
                <Label htmlFor="name">{t('name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="name_ar">{language === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}</Label>
                <Input
                  id="name_ar"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="parent_asset">
                  {language === 'ar' ? 'الأصل الرئيسي' : 'Parent Asset'}
                </Label>
                <Select
                  value={formData.parent_asset_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, parent_asset_id: value === "none" ? '' : value })}
                >
                  <SelectTrigger id="parent_asset">
                    <SelectValue placeholder={language === 'ar' ? 'لا يوجد (أصل رئيسي)' : 'None (Root Asset)'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{language === 'ar' ? 'لا يوجد (أصل رئيسي)' : 'None (Root Asset)'}</SelectItem>
                    {availableParentAssets
                      .filter(a => a.id !== asset?.id)
                      .map((parentAsset) => (
                        <SelectItem key={parentAsset.id} value={parentAsset.id}>
                          {language === 'ar' ? parentAsset.name_ar : parentAsset.name} ({parentAsset.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' ? 'اختياري - لإنشاء هيكل هرمي' : 'Optional - for hierarchical structure'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category">{t('category')}</Label>
                <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical">{language === 'ar' ? 'طبي' : 'Medical'}</SelectItem>
                    <SelectItem value="electrical">{language === 'ar' ? 'كهربائي' : 'Electrical'}</SelectItem>
                    <SelectItem value="mechanical">{language === 'ar' ? 'ميكانيكي' : 'Mechanical'}</SelectItem>
                    <SelectItem value="plumbing">{language === 'ar' ? 'سباكة' : 'Plumbing'}</SelectItem>
                    <SelectItem value="safety">{language === 'ar' ? 'السلامة' : 'Safety'}</SelectItem>
                    <SelectItem value="other">{language === 'ar' ? 'أخرى' : 'Other'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">{t('status')}</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                    <SelectItem value="maintenance">{language === 'ar' ? 'صيانة' : 'Maintenance'}</SelectItem>
                    <SelectItem value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</SelectItem>
                    <SelectItem value="retired">{language === 'ar' ? 'متقاعد' : 'Retired'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="criticality">{t('criticality')}</Label>
                <Select value={formData.criticality} onValueChange={(value: any) => setFormData({ ...formData, criticality: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essential">{language === 'ar' ? 'أساسي' : 'Essential'}</SelectItem>
                    <SelectItem value="critical">{language === 'ar' ? 'حرج' : 'Critical'}</SelectItem>
                    <SelectItem value="non_essential">{language === 'ar' ? 'غير أساسي' : 'Non-Essential'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">{language === 'ar' ? 'التفاصيل التقنية' : 'Technical Details'}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manufacturer">{language === 'ar' ? 'الشركة المصنعة' : 'Manufacturer'}</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="model">{language === 'ar' ? 'الطراز' : 'Model'}</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="serial_number">{language === 'ar' ? 'الرقم التسلسلي' : 'Serial Number'}</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="supplier">{language === 'ar' ? 'المورد' : 'Supplier'}</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ar' ? 'تاريخ الشراء' : 'Purchase Date'}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.purchase_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.purchase_date ? format(formData.purchase_date, "PPP") : <span>{language === 'ar' ? 'اختر تاريخ' : 'Pick a date'}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.purchase_date || undefined}
                      onSelect={(date) => setFormData({ ...formData, purchase_date: date || null })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>{language === 'ar' ? 'تاريخ التركيب' : 'Installation Date'}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.installation_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.installation_date ? format(formData.installation_date, "PPP") : <span>{language === 'ar' ? 'اختر تاريخ' : 'Pick a date'}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.installation_date || undefined}
                      onSelect={(date) => setFormData({ ...formData, installation_date: date || null })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ar' ? 'تاريخ انتهاء الضمان' : 'Warranty Expiry'}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.warranty_expiry && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.warranty_expiry ? format(formData.warranty_expiry, "PPP") : <span>{language === 'ar' ? 'اختر تاريخ' : 'Pick a date'}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.warranty_expiry || undefined}
                      onSelect={(date) => setFormData({ ...formData, warranty_expiry: date || null })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="purchase_cost">{language === 'ar' ? 'تكلفة الشراء' : 'Purchase Cost'}</Label>
                <Input
                  id="purchase_cost"
                  type="number"
                  step="0.01"
                  value={formData.purchase_cost}
                  onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                  placeholder={language === 'ar' ? 'ريال سعودي' : 'SAR'}
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="font-semibold">{t('location')}</h3>
            <LocationPicker
              value={location}
              onChange={setLocation}
              showHospital={false}
              required={false}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading || uploadingImage}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading || uploadingImage}>
              {uploadingImage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'ar' ? 'جاري رفع الصورة...' : 'Uploading image...'}
                </>
              ) : loading ? (
                t('loading')
              ) : (
                t('save')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
