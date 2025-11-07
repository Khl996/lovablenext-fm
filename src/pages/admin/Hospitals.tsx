import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Hospital } from 'lucide-react';

interface HospitalData {
  id: string;
  name: string;
  name_ar: string;
  type: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export default function Hospitals() {
  const { language, t } = useLanguage();
  const [hospitals, setHospitals] = useState<HospitalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<HospitalData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    type: '',
    address: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    loadHospitals();
  }, []);

  const loadHospitals = async () => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHospitals(data || []);
    } catch (error) {
      console.error('Error loading hospitals:', error);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.name_ar) {
      toast.error(t('fillRequired'));
      return;
    }

    try {
      if (editingHospital) {
        // Update existing hospital
        const { error } = await supabase
          .from('hospitals')
          .update(formData)
          .eq('id', editingHospital.id);

        if (error) throw error;
        toast.success(t('hospitalUpdated'));
      } else {
        // Insert new hospital
        const { error } = await supabase
          .from('hospitals')
          .insert([formData]);

        if (error) throw error;
        toast.success(t('hospitalAdded'));
      }

      setIsDialogOpen(false);
      setEditingHospital(null);
      setFormData({
        name: '',
        name_ar: '',
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
      type: hospital.type || '',
      address: hospital.address || '',
      phone: hospital.phone || '',
      email: hospital.email || '',
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingHospital(null);
      setFormData({
        name: '',
        name_ar: '',
        type: '',
        address: '',
        phone: '',
        email: '',
      });
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
                <Button type="submit">{editingHospital ? t('save') : t('submit')}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hospitals.map((hospital) => (
          <Card key={hospital.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleEdit(hospital)}>
            <CardHeader>
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
            </CardHeader>
            <CardContent className="space-y-2">
              {hospital.address && (
                <p className="text-sm text-muted-foreground">{hospital.address}</p>
              )}
              {hospital.phone && (
                <p className="text-sm text-muted-foreground" dir="ltr">{hospital.phone}</p>
              )}
              {hospital.email && (
                <p className="text-sm text-muted-foreground" dir="ltr">{hospital.email}</p>
              )}
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
    </div>
  );
}
