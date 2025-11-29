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
import { Plus, Trash2, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export default function Specializations() {
  const { language } = useLanguage();
  const { hospitalId, permissions, loading } = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  const canManage = permissions.hasPermission('settings.lookup_tables', hospitalId);

  // Check if user has permission to access settings
  useEffect(() => {
    // Don't check permissions while still loading
    if (loading || permissions.loading) return;
    
    if (!canManage) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar'
          ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة'
          : 'You do not have permission to access this page',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [canManage, loading, permissions.loading, navigate, language, toast]);

  const [specializations, setSpecializations] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    category: '',
    description: '',
  });

  const categories = [
    { value: 'electrical', labelAr: 'كهرباء', labelEn: 'Electrical' },
    { value: 'hvac', labelAr: 'تكييف وتبريد', labelEn: 'HVAC' },
    { value: 'plumbing', labelAr: 'سباكة', labelEn: 'Plumbing' },
    { value: 'civil', labelAr: 'مباني وإنشاءات', labelEn: 'Civil' },
    { value: 'biomedical', labelAr: 'أجهزة طبية', labelEn: 'Biomedical' },
    { value: 'cleaning', labelAr: 'نظافة', labelEn: 'Cleaning' },
    { value: 'safety', labelAr: 'سلامة', labelEn: 'Safety' },
    { value: 'it', labelAr: 'تقنية معلومات', labelEn: 'IT' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
  ];

  useEffect(() => {
    if (hospitalId) {
      loadSpecializations();
    }
  }, [hospitalId]);

  const loadSpecializations = async () => {
    if (!hospitalId) return;
    try {
      const { data, error } = await supabase
        .from('specializations')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('category, name');
      if (error) throw error;
      setSpecializations(data || []);
    } catch (error) {
      console.error('Error loading specializations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name || !formData.name_ar || !formData.category) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingSpec) {
        const { error } = await supabase
          .from('specializations')
          .update({
            code: formData.code,
            name: formData.name,
            name_ar: formData.name_ar,
            category: formData.category,
            description: formData.description,
          })
          .eq('id', editingSpec.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('specializations')
          .insert([{
            hospital_id: hospitalId!,
            code: formData.code,
            name: formData.name,
            name_ar: formData.name_ar,
            category: formData.category,
            description: formData.description,
          }]);
        if (error) throw error;
      }

      toast({
        title: language === 'ar' ? 'نجح' : 'Success',
        description: editingSpec
          ? (language === 'ar' ? 'تم تحديث التخصص بنجاح' : 'Specialization updated successfully')
          : (language === 'ar' ? 'تم إضافة التخصص بنجاح' : 'Specialization added successfully'),
      });

      setDialogOpen(false);
      setEditingSpec(null);
      setFormData({ code: '', name: '', name_ar: '', category: '', description: '' });
      loadSpecializations();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('specializations')
        .delete()
        .eq('id', id);
      if (error) throw error;

      toast({
        title: language === 'ar' ? 'نجح' : 'Success',
        description: language === 'ar' ? 'تم حذف التخصص بنجاح' : 'Specialization deleted successfully',
      });
      loadSpecializations();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (spec: any) => {
    setEditingSpec(spec);
    setFormData({
      code: spec.code,
      name: spec.name,
      name_ar: spec.name_ar,
      category: spec.category,
      description: spec.description || '',
    });
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingSpec(null);
    setFormData({ code: '', name: '', name_ar: '', category: '', description: '' });
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{language === 'ar' ? 'التخصصات الفنية' : 'Technical Specializations'}</h1>
          <p className="text-muted-foreground mt-2">
            {language === 'ar' ? 'إدارة المهارات والتخصصات الفنية للفنيين والمهندسين' : 'Manage technical skills and specializations for technicians and engineers'}
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'إضافة تخصص' : 'Add Specialization'}
        </Button>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{language === 'ar' ? 'الرمز' : 'Code'}</TableHead>
              <TableHead>{language === 'ar' ? 'الاسم (EN)' : 'Name (EN)'}</TableHead>
              <TableHead>{language === 'ar' ? 'الاسم (AR)' : 'Name (AR)'}</TableHead>
              <TableHead>{language === 'ar' ? 'الفئة' : 'Category'}</TableHead>
              <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
              <TableHead className="text-right">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {specializations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {language === 'ar' ? 'لا توجد تخصصات حتى الآن' : 'No specializations yet'}
                </TableCell>
              </TableRow>
            ) : (
              specializations.map((spec) => (
                <TableRow key={spec.id}>
                  <TableCell className="font-mono">{spec.code}</TableCell>
                  <TableCell>{spec.name}</TableCell>
                  <TableCell>{spec.name_ar}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {language === 'ar'
                        ? categories.find(c => c.value === spec.category)?.labelAr
                        : categories.find(c => c.value === spec.category)?.labelEn}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{spec.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(spec)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(spec.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSpec
                ? (language === 'ar' ? 'تعديل التخصص' : 'Edit Specialization')
                : (language === 'ar' ? 'إضافة تخصص جديد' : 'Add New Specialization')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الرمز' : 'Code'} *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="ELEC-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (بالإنجليزية)' : 'Name (English)'} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="High Voltage Systems"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (بالعربية)' : 'Name (Arabic)'} *</Label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="أنظمة الجهد العالي"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الفئة' : 'Category'} *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الفئة' : 'Select category'} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {language === 'ar' ? cat.labelAr : cat.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder={language === 'ar' ? 'وصف التخصص...' : 'Specialization description...'}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit">
                {editingSpec
                  ? (language === 'ar' ? 'تحديث' : 'Update')
                  : (language === 'ar' ? 'إضافة' : 'Add')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
