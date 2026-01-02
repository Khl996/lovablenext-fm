import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Building2, Pencil, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface CompanyData {
  id: string;
  name: string;
  name_ar: string;
  logo_url: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  status: string;
}

export default function Companies() {
  const { language, t } = useLanguage();
  const { user, hospitalId } = useCurrentUser();
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    logo_url: '',
    contact_person: '',
    phone: '',
    email: '',
    status: 'active',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (hospitalId) {
      loadCompanies();
    } else {
      setLoading(false);
    }
  }, [hospitalId]);

  const loadCompanies = async () => {
    if (!hospitalId) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await (supabase as any)
        .from('companies')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء تحميل الشركات' : 'Error loading companies');
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      setUploadingLogo(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${hospitalId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
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

    if (!hospitalId) {
      toast.error(language === 'ar' ? 'لا يوجد مستشفى مرتبط بحسابك' : 'No hospital associated with your account');
      return;
    }

    try {
      let logoUrl = formData.logo_url;

      // Upload logo if a new file is selected
      if (logoFile) {
        const uploadedUrl = await uploadLogo(logoFile);
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        } else {
          return; // Stop if upload fails
        }
      }

      // Prepare company data without logo_url if it's empty or still a preview
      const companyData: any = {
        name: formData.name,
        name_ar: formData.name_ar,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        status: formData.status,
      };

      // Only include logo_url if it's a valid URL (not a DataURL)
      if (logoUrl && !logoUrl.startsWith('data:')) {
        companyData.logo_url = logoUrl;
      }

      if (editingCompany) {
        const { error } = await (supabase as any)
          .from('companies')
          .update(companyData)
          .eq('id', editingCompany.id);

        if (error) throw error;
        toast.success(language === 'ar' ? 'تم تحديث الشركة بنجاح' : 'Company updated successfully');
      } else {
        const { error } = await (supabase as any)
          .from('companies')
          .insert([{ ...companyData, hospital_id: hospitalId }]);

        if (error) throw error;
        toast.success(language === 'ar' ? 'تم إضافة الشركة بنجاح' : 'Company added successfully');
      }

      setIsDialogOpen(false);
      setEditingCompany(null);
      setFormData({
        name: '',
        name_ar: '',
        logo_url: '',
        contact_person: '',
        phone: '',
        email: '',
        status: 'active',
      });
      setLogoFile(null);
      setLogoPreview(null);
      loadCompanies();
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error(language === 'ar' ? 'حدث خطأ' : 'Error occurred');
    }
  };

  const handleEdit = (company: CompanyData) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      name_ar: company.name_ar,
      logo_url: company.logo_url || '',
      contact_person: company.contact_person || '',
      phone: company.phone || '',
      email: company.email || '',
      status: company.status,
    });
    setLogoFile(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل تريد حذف هذه الشركة؟' : 'Are you sure you want to delete this company?')) {
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success(language === 'ar' ? 'تم حذف الشركة بنجاح' : 'Company deleted successfully');
      loadCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting company');
    }
  };

  if (loading) {
    return <div className="p-8">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>;
  }

  const isPlatformOwner = profile?.role === 'platform_owner' || profile?.role === 'platform_admin';

  if (!hospitalId && !isPlatformOwner) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              {language === 'ar' ? 'لا يوجد مستشفى مرتبط بحسابك. يرجى التواصل مع المسؤول.' : 'No hospital associated with your account. Please contact administrator.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{language === 'ar' ? 'إدارة الشركات' : 'Manage Companies'}</h1>
          <p className="text-muted-foreground mt-2">
            {language === 'ar' 
              ? 'إدارة الشركات المتعاقدة مع المستشفى' 
              : 'Manage contracted companies with the hospital'}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingCompany(null);
              setFormData({
                name: '',
                name_ar: '',
                logo_url: '',
                contact_person: '',
                phone: '',
                email: '',
                status: 'active',
              });
              setLogoFile(null);
              setLogoPreview(null);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إضافة شركة' : 'Add Company'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCompany 
                  ? (language === 'ar' ? 'تعديل الشركة' : 'Edit Company')
                  : (language === 'ar' ? 'إضافة شركة جديدة' : 'Add New Company')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} *</Label>
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
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'شعار الشركة' : 'Company Logo'}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoFile(file);
                        // Create preview URL
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setLogoPreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    disabled={uploadingLogo}
                  />
                  {uploadingLogo && (
                    <div className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}
                    </div>
                  )}
                </div>
                {(logoPreview || (formData.logo_url && !logoFile)) && (
                  <div className="mt-2 p-4 border rounded-lg flex items-center justify-center bg-muted">
                    <img 
                      src={logoPreview || formData.logo_url} 
                      alt="Logo preview" 
                      className="max-h-20 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الشخص المسؤول' : 'Contact Person'}</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={uploadingLogo}>
                  {uploadingLogo 
                    ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                    : editingCompany 
                    ? (language === 'ar' ? 'تحديث' : 'Update')
                    : (language === 'ar' ? 'إضافة' : 'Add')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {language === 'ar' ? company.name_ar : company.name}
              </CardTitle>
              <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                {company.status === 'active' 
                  ? (language === 'ar' ? 'نشط' : 'Active')
                  : (language === 'ar' ? 'غير نشط' : 'Inactive')}
              </Badge>
            </CardHeader>
            <CardContent>
              {company.logo_url && (
                <div className="mb-4 flex items-center justify-center p-4 bg-muted rounded-lg">
                  <img 
                    src={company.logo_url} 
                    alt={company.name} 
                    className="max-h-16 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="space-y-2 text-sm">
                {company.contact_person && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{language === 'ar' ? 'المسؤول:' : 'Contact:'}</span>
                    <span>{company.contact_person}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{language === 'ar' ? 'الهاتف:' : 'Phone:'}</span>
                    <span>{company.phone}</span>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{language === 'ar' ? 'البريد:' : 'Email:'}</span>
                    <span className="text-xs">{company.email}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => handleEdit(company)} className="flex-1">
                  <Pencil className="h-4 w-4 mr-1" />
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleDelete(company.id)}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {companies.length === 0 && (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {language === 'ar' ? 'لا توجد شركات مضافة' : 'No companies added yet'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
