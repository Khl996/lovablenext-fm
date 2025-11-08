import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocationPicker, LocationValue } from '@/components/LocationPicker';

interface Asset {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  category: string;
  subcategory?: string;
  type?: string;
  status: string;
  criticality: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  installation_date?: string;
  warranty_expiry?: string;
  warranty_provider?: string;
  supplier?: string;
  building_id?: string;
  floor_id?: string;
  department_id?: string;
  room_id?: string;
  specifications?: any;
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
  const [form, setForm] = useState<{
    code: string;
    name: string;
    name_ar: string;
    category: 'medical' | 'electrical' | 'mechanical' | 'plumbing' | 'safety' | 'other';
    subcategory: string;
    type: string;
    status: 'active' | 'inactive' | 'maintenance' | 'retired';
    criticality: 'essential' | 'critical' | 'non_essential';
    manufacturer: string;
    model: string;
    serial_number: string;
    purchase_date: string;
    purchase_cost: string;
    installation_date: string;
    warranty_expiry: string;
    warranty_provider: string;
    supplier: string;
  }>({
    code: '',
    name: '',
    name_ar: '',
    category: 'medical',
    subcategory: '',
    type: '',
    status: 'active',
    criticality: 'non_essential',
    manufacturer: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    purchase_cost: '',
    installation_date: '',
    warranty_expiry: '',
    warranty_provider: '',
    supplier: '',
  });

  const [location, setLocation] = useState<LocationValue>({
    hospitalId: null,
    buildingId: null,
    floorId: null,
    departmentId: null,
    roomId: null,
  });

  useEffect(() => {
    if (asset) {
      setForm({
        code: asset.code,
        name: asset.name,
        name_ar: asset.name_ar,
        category: asset.category as any,
        subcategory: asset.subcategory || '',
        type: asset.type || '',
        status: asset.status as any,
        criticality: asset.criticality as any,
        manufacturer: asset.manufacturer || '',
        model: asset.model || '',
        serial_number: asset.serial_number || '',
        purchase_date: asset.purchase_date || '',
        purchase_cost: asset.purchase_cost?.toString() || '',
        installation_date: asset.installation_date || '',
        warranty_expiry: asset.warranty_expiry || '',
        warranty_provider: asset.warranty_provider || '',
        supplier: asset.supplier || '',
      });
      setLocation({
        hospitalId: hospitalId,
        buildingId: asset.building_id || null,
        floorId: asset.floor_id || null,
        departmentId: asset.department_id || null,
        roomId: asset.room_id || null,
      });
    } else {
      setForm({
        code: '',
        name: '',
        name_ar: '',
        category: 'medical',
        subcategory: '',
        type: '',
        status: 'active',
        criticality: 'non_essential',
        manufacturer: '',
        model: '',
        serial_number: '',
        purchase_date: '',
        purchase_cost: '',
        installation_date: '',
        warranty_expiry: '',
        warranty_provider: '',
        supplier: '',
      });
      setLocation({
        hospitalId: hospitalId,
        buildingId: null,
        floorId: null,
        departmentId: null,
        roomId: null,
      });
    }
  }, [asset, hospitalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.code || !form.name || !form.name_ar || !hospitalId) {
      toast({
        title: t('error'),
        description: t('fillRequired'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const assetData = {
        code: form.code,
        name: form.name,
        name_ar: form.name_ar,
        hospital_id: hospitalId,
        category: form.category,
        subcategory: form.subcategory || null,
        type: form.type || null,
        status: form.status,
        criticality: form.criticality,
        manufacturer: form.manufacturer || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        purchase_date: form.purchase_date || null,
        purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
        installation_date: form.installation_date || null,
        warranty_expiry: form.warranty_expiry || null,
        warranty_provider: form.warranty_provider || null,
        supplier: form.supplier || null,
        building_id: location.buildingId,
        floor_id: location.floorId,
        department_id: location.departmentId,
        room_id: location.roomId,
      };

      let error;
      if (asset) {
        const result = await supabase
          .from('assets')
          .update(assetData)
          .eq('id', asset.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('assets')
          .insert([assetData]);
        error = result.error;
      }

      if (error) throw error;

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {asset 
              ? (language === 'ar' ? 'تعديل أصل' : 'Edit Asset')
              : t('addAsset')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">{language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">{t('code')} *</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="name">{t('name')} *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="name_ar">{t('nameArabic')} *</Label>
                <Input
                  id="name_ar"
                  value={form.name_ar}
                  onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                  required
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="category">{t('category')}</Label>
                <Select value={form.category} onValueChange={(value: any) => setForm({ ...form, category: value })}>
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
                <Select value={form.status} onValueChange={(value: any) => setForm({ ...form, status: value })}>
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
                <Select value={form.criticality} onValueChange={(value: any) => setForm({ ...form, criticality: value })}>
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
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="model">{language === 'ar' ? 'الطراز' : 'Model'}</Label>
                <Input
                  id="model"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="serial_number">{language === 'ar' ? 'الرقم التسلسلي' : 'Serial Number'}</Label>
                <Input
                  id="serial_number"
                  value={form.serial_number}
                  onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="supplier">{language === 'ar' ? 'المورد' : 'Supplier'}</Label>
                <Input
                  id="supplier"
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Purchase & Warranty */}
          <div className="space-y-4">
            <h3 className="font-semibold">{language === 'ar' ? 'الشراء والضمان' : 'Purchase & Warranty'}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase_date">{language === 'ar' ? 'تاريخ الشراء' : 'Purchase Date'}</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="purchase_cost">{language === 'ar' ? 'تكلفة الشراء' : 'Purchase Cost'}</Label>
                <Input
                  id="purchase_cost"
                  type="number"
                  step="0.01"
                  value={form.purchase_cost}
                  onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="installation_date">{language === 'ar' ? 'تاريخ التركيب' : 'Installation Date'}</Label>
                <Input
                  id="installation_date"
                  type="date"
                  value={form.installation_date}
                  onChange={(e) => setForm({ ...form, installation_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="warranty_expiry">{language === 'ar' ? 'انتهاء الضمان' : 'Warranty Expiry'}</Label>
                <Input
                  id="warranty_expiry"
                  type="date"
                  value={form.warranty_expiry}
                  onChange={(e) => setForm({ ...form, warranty_expiry: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="warranty_provider">{language === 'ar' ? 'مزود الضمان' : 'Warranty Provider'}</Label>
                <Input
                  id="warranty_provider"
                  value={form.warranty_provider}
                  onChange={(e) => setForm({ ...form, warranty_provider: e.target.value })}
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
