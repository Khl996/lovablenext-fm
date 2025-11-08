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
import { Calendar as CalendarIcon } from 'lucide-react';
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
  const [generatedCode, setGeneratedCode] = useState('');
  const [availableParentAssets, setAvailableParentAssets] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    parent_asset_id: '',
    category: 'medical_equipment',
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
      const { data, error } = await supabase
        .from('assets')
        .select('code')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastCode = data[0].code;
        const match = lastCode.match(/AST-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      return `AST-${nextNumber.toString().padStart(4, '0')}`;
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
        });
        setGeneratedCode(asset.code);
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
          category: 'medical_equipment',
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
        });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hospitalId) return;

    setLoading(true);
    try {
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
      };

      if (asset) {
        const { error } = await supabase
          .from('assets')
          .update(payload)
          .eq('id', asset.id);

        if (error) throw error;
      } else {
        payload.code = generatedCode;
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
                  value={formData.parent_asset_id}
                  onValueChange={(value) => setFormData({ ...formData, parent_asset_id: value })}
                >
                  <SelectTrigger id="parent_asset">
                    <SelectValue placeholder={language === 'ar' ? 'لا يوجد (أصل رئيسي)' : 'None (Root Asset)'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{language === 'ar' ? 'لا يوجد (أصل رئيسي)' : 'None (Root Asset)'}</SelectItem>
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
                    <SelectItem value="medical_equipment">{language === 'ar' ? 'معدات طبية' : 'Medical Equipment'}</SelectItem>
                    <SelectItem value="hvac">{language === 'ar' ? 'تكييف وتهوية' : 'HVAC'}</SelectItem>
                    <SelectItem value="electrical">{language === 'ar' ? 'كهربائي' : 'Electrical'}</SelectItem>
                    <SelectItem value="plumbing">{language === 'ar' ? 'سباكة' : 'Plumbing'}</SelectItem>
                    <SelectItem value="fire_safety">{language === 'ar' ? 'السلامة من الحريق' : 'Fire Safety'}</SelectItem>
                    <SelectItem value="it_equipment">{language === 'ar' ? 'معدات تقنية' : 'IT Equipment'}</SelectItem>
                    <SelectItem value="furniture">{language === 'ar' ? 'أثاث' : 'Furniture'}</SelectItem>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('loading') : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
