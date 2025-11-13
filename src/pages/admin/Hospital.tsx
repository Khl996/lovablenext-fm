import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Building2, Upload, Save } from 'lucide-react';

interface HospitalData {
  id: string;
  name: string;
  name_ar: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  type: string | null;
  notes: string | null;
}

export default function Hospital() {
  const { language } = useLanguage();
  const { hospitalId } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<HospitalData>({
    id: '',
    name: '',
    name_ar: '',
    logo_url: '',
    phone: '',
    email: '',
    address: '',
    type: '',
    notes: '',
  });

  useEffect(() => {
    if (hospitalId) {
      loadHospital();
    }
  }, [hospitalId]);

  const loadHospital = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('hospitals')
        .select('*')
        .eq('id', hospitalId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData(data);
      }
    } catch (error) {
      console.error('Error loading hospital:', error);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء تحميل بيانات المستشفى' : 'Error loading hospital data');
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      setUploadingLogo(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${hospitalId}_${Date.now()}.${fileExt}`;
      const filePath = `${hospitalId}/${fileName}`;

      // Delete old logo if exists
      if (formData.logo_url) {
        const oldPath = formData.logo_url.split('/').slice(-2).join('/');
        await supabase.storage.from('hospital-logos').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('hospital-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hospital-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(language === 'ar' ? 'فشل رفع الشعار' : 'Failed to upload logo');
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.name_ar) {
      toast.error(language === 'ar' ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    try {
      setSaving(true);
      let logoUrl = formData.logo_url;

      // Upload logo if a new file is selected
      if (logoFile) {
        const uploadedUrl = await uploadLogo(logoFile);
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        } else {
          setSaving(false);
          return;
        }
      }

      const { error } = await (supabase as any)
        .from('hospitals')
        .update({
          name: formData.name,
          name_ar: formData.name_ar,
          logo_url: logoUrl,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          type: formData.type,
          notes: formData.notes,
        })
        .eq('id', hospitalId);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم تحديث بيانات المستشفى بنجاح' : 'Hospital data updated successfully');
      setLogoFile(null);
      loadHospital();
    } catch (error) {
      console.error('Error updating hospital:', error);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء التحديث' : 'Error updating hospital');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          {language === 'ar' ? 'إدارة المستشفى' : 'Hospital Management'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {language === 'ar' 
            ? 'إدارة معلومات وشعار المستشفى' 
            : 'Manage hospital information and logo'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'معلومات المستشفى' : 'Hospital Information'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Upload Section */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">
                {language === 'ar' ? 'شعار المستشفى' : 'Hospital Logo'}
              </Label>
              {formData.logo_url && (
                <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted">
                  <img 
                    src={formData.logo_url} 
                    alt="Hospital logo" 
                    className="max-h-32 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLogoFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData({ ...formData, logo_url: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  disabled={uploadingLogo || saving}
                />
                {uploadingLogo && (
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}
                  </div>
                )}
              </div>
            </div>

            {/* Hospital Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم المستشفى (إنجليزي)' : 'Hospital Name (English)'} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم المستشفى (عربي)' : 'Hospital Name (Arabic)'} *</Label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  required
                  dir="rtl"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</Label>
                <Input
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع المستشفى' : 'Hospital Type'}</Label>
              <Input
                value={formData.type || ''}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder={language === 'ar' ? 'مثال: حكومي، خاص، جامعي' : 'E.g.: Government, Private, University'}
                disabled={saving}
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'العنوان' : 'Address'}</Label>
              <Textarea
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                disabled={saving}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                disabled={saving}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="submit" disabled={saving || uploadingLogo}>
                <Save className="h-4 w-4 mr-2" />
                {saving 
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                  : (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
