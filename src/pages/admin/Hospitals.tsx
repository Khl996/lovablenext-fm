import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Hospital, Ban, CheckCircle, Trash2 } from 'lucide-react';

interface HospitalData {
  id: string;
  name: string;
  name_ar: string;
  logo_url: string | null;
  type: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
}

export default function Hospitals() {
  const { language, t } = useLanguage();
  const { user, permissions } = useCurrentUser();
  const [hospitals, setHospitals] = useState<HospitalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<HospitalData | null>(null);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<HospitalData | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    logo_url: '',
    type: '',
    address: '',
    phone: '',
    email: '',
  });

  const canSuspend = permissions.hasPermission('hospitals.suspend');
  const canDelete = permissions.hasPermission('hospitals.delete');

  useEffect(() => {
    loadHospitals();
  }, []);

  const loadHospitals = async () => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('id, name, name_ar, logo_url, type, address, phone, email, status, suspended_at, suspended_by, suspension_reason')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHospitals(data as any || []);
    } catch (error) {
      console.error('Error loading hospitals:', error);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (file: File, hospitalId: string): Promise<string | null> => {
    try {
      setUploadingLogo(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${hospitalId}_${Date.now()}.${fileExt}`;
      const filePath = `${hospitalId}/${fileName}`;

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
      toast.error(t('fillRequired'));
      return;
    }

    try {
      let logoUrl = formData.logo_url;

      if (editingHospital) {
        // Upload logo if a new file is selected
        if (logoFile) {
          const uploadedUrl = await uploadLogo(logoFile, editingHospital.id);
          if (uploadedUrl) {
            logoUrl = uploadedUrl;
            // Delete old logo if exists
            if (formData.logo_url) {
              const oldPath = formData.logo_url.split('/').slice(-2).join('/');
              await supabase.storage.from('hospital-logos').remove([oldPath]);
            }
          } else {
            return;
          }
        }

        // Update existing hospital
        const { error } = await (supabase as any)
          .from('hospitals')
          .update({ ...formData, logo_url: logoUrl })
          .eq('id', editingHospital.id);

        if (error) throw error;
        toast.success(t('hospitalUpdated'));
      } else {
        // Insert new hospital first
        const { data: newHospital, error: insertError } = await supabase
          .from('hospitals')
          .insert([formData])
          .select()
          .single();

        if (insertError) throw insertError;

        // Upload logo if a file is selected
        if (logoFile && newHospital) {
          const uploadedUrl = await uploadLogo(logoFile, newHospital.id);
          if (uploadedUrl) {
            const { error: updateError } = await (supabase as any)
              .from('hospitals')
              .update({ logo_url: uploadedUrl })
              .eq('id', newHospital.id);

            if (updateError) throw updateError;
          }
        }

        toast.success(t('hospitalAdded'));
      }

      setIsDialogOpen(false);
      setEditingHospital(null);
      setLogoFile(null);
      setFormData({
        name: '',
        name_ar: '',
        logo_url: '',
        type: '',
        address: '',
        phone: '',
        email: '',
      });
      loadHospitals();
    } catch (error) {
      console.error('Error saving hospital:', error);
      toast.error(t('errorOccurred'));
    }
  };

  const handleEdit = (hospital: HospitalData) => {
    setEditingHospital(hospital);
    setFormData({
      name: hospital.name,
      name_ar: hospital.name_ar,
      logo_url: hospital.logo_url || '',
      type: hospital.type || '',
      address: hospital.address || '',
      phone: hospital.phone || '',
      email: hospital.email || '',
    });
    setLogoFile(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingHospital(null);
      setLogoFile(null);
      setFormData({
        name: '',
        name_ar: '',
        logo_url: '',
        type: '',
        address: '',
        phone: '',
        email: '',
      });
    }
  };

  const handleSuspend = async () => {
    if (!selectedHospital || !suspensionReason) {
      toast.error(language === 'ar' ? 'الرجاء إدخال سبب التعليق' : 'Please enter suspension reason');
      return;
    }
    try {
      const { error } = await supabase
        .from('hospitals')
        .update({
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspended_by: user?.id,
          suspension_reason: suspensionReason,
        })
        .eq('id', selectedHospital.id);
      if (error) throw error;
      toast.success(language === 'ar' ? 'تم تعليق المستشفى' : 'Hospital suspended');
      setSuspendDialogOpen(false);
      setSuspensionReason('');
      loadHospitals();
    } catch (error) {
      console.error('Error suspending hospital:', error);
      toast.error(t('errorOccurred'));
    }
  };

  const handleActivate = async (hospital: HospitalData) => {
    try {
      const { error } = await supabase
        .from('hospitals')
        .update({
          status: 'active',
          suspended_at: null,
          suspended_by: null,
          suspension_reason: null,
        })
        .eq('id', hospital.id);
      if (error) throw error;
      toast.success(language === 'ar' ? 'تم تفعيل المستشفى' : 'Hospital activated');
      loadHospitals();
    } catch (error) {
      console.error('Error activating hospital:', error);
      toast.error(t('errorOccurred'));
    }
  };

  const handleDelete = async () => {
    if (!selectedHospital) return;
    try {
      const { error } = await supabase
        .from('hospitals')
        .delete()
        .eq('id', selectedHospital.id);
      if (error) throw error;
      toast.success(language === 'ar' ? 'تم حذف المستشفى' : 'Hospital deleted');
      setDeleteDialogOpen(false);
      loadHospitals();
    } catch (error) {
      console.error('Error deleting hospital:', error);
      toast.error(t('errorOccurred'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{language === 'ar' ? 'المستشفيات' : 'Hospitals'}</h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'إدارة المستشفيات في النظام' : 'Manage hospitals in the system'}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('addHospital')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHospital ? t('editHospital') : t('addHospital')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('hospitalName')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name_ar">{t('hospitalNameAr')}</Label>
                <Input
                  id="name_ar"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'شعار المستشفى' : 'Hospital Logo'}</Label>
                {formData.logo_url && (
                  <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg bg-muted">
                    <img 
                      src={formData.logo_url} 
                      alt="Hospital logo" 
                      className="max-h-24 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
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
                  disabled={uploadingLogo}
                />
                {uploadingLogo && (
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">{t('hospitalType')}</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t('address')}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={uploadingLogo}>
                  {editingHospital ? t('save') : t('submit')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hospitals.map((hospital) => (
          <Card key={hospital.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/5 p-3 rounded-lg border border-border">
                    <Hospital className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {language === 'ar' ? hospital.name_ar : hospital.name}
                    </CardTitle>
                    {hospital.type && (
                      <p className="text-sm text-muted-foreground mt-1">{hospital.type}</p>
                    )}
                  </div>
                </div>
                <Badge variant={hospital.status === 'active' ? 'default' : 'destructive'}>
                  {hospital.status === 'active' 
                    ? (language === 'ar' ? 'نشط' : 'Active')
                    : (language === 'ar' ? 'معلق' : 'Suspended')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {hospital.address && (
                <p className="text-sm text-muted-foreground">{hospital.address}</p>
              )}
              {hospital.phone && (
                <p className="text-sm text-muted-foreground" dir="ltr">{hospital.phone}</p>
              )}
              {hospital.email && (
                <p className="text-sm text-muted-foreground" dir="ltr">{hospital.email}</p>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(hospital)} className="flex-1">
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Button>
                {canSuspend && hospital.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedHospital(hospital);
                      setSuspendDialogOpen(true);
                    }}
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                )}
                {canSuspend && hospital.status === 'suspended' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleActivate(hospital)}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedHospital(hospital);
                      setDeleteDialogOpen(true);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hospitals.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Hospital className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {language === 'ar' ? 'لا توجد مستشفيات' : 'No hospitals yet'}
            </p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'تعليق المستشفى' : 'Suspend Hospital'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'الرجاء إدخال سبب تعليق هذا المستشفى'
                : 'Please enter the reason for suspending this hospital'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'سبب التعليق' : 'Suspension Reason'}</Label>
            <Input
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              placeholder={language === 'ar' ? 'أدخل السبب...' : 'Enter reason...'}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspend} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {language === 'ar' ? 'تعليق' : 'Suspend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'حذف المستشفى' : 'Delete Hospital'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد من حذف هذا المستشفى؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this hospital? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
