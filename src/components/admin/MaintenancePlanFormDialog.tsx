import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type MaintenancePlanFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  plan?: any;
};

export function MaintenancePlanFormDialog({ open, onOpenChange, onSuccess, plan }: MaintenancePlanFormDialogProps) {
  const { t, language } = useLanguage();
  const { hospitalId } = useCurrentUser();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    year: new Date().getFullYear(),
    department: '',
    budget: '',
    status: 'active'
  });

  useEffect(() => {
    if (open) {
      if (plan) {
        setFormData({
          code: plan.code || '',
          name: plan.name || '',
          name_ar: plan.name_ar || '',
          year: plan.year || new Date().getFullYear(),
          department: plan.department || '',
          budget: plan.budget?.toString() || '',
          status: plan.status || 'active'
        });
      } else {
        generateCode();
      }
    }
  }, [open, plan]);

  const generateCode = async () => {
    const year = new Date().getFullYear();
    const { data: latestPlan } = await supabase
      .from('maintenance_plans')
      .select('code')
      .eq('hospital_id', hospitalId)
      .ilike('code', `MP-${year}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNumber = 1;
    if (latestPlan?.code) {
      const match = latestPlan.code.match(/MP-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const code = `MP-${year}-${nextNumber.toString().padStart(3, '0')}`;
    setFormData(prev => ({ ...prev, code, year }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.name_ar || !formData.year) {
      toast({
        title: t('error'),
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const planData = {
        ...formData,
        hospital_id: hospitalId,
        budget: formData.budget ? parseFloat(formData.budget) : null
      };

      if (plan) {
        const { error } = await supabase
          .from('maintenance_plans')
          .update(planData)
          .eq('id', plan.id);

        if (error) throw error;

        toast({
          title: t('success'),
          description: language === 'ar' ? 'تم تحديث الخطة بنجاح' : 'Plan updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('maintenance_plans')
          .insert([planData]);

        if (error) throw error;

        toast({
          title: t('success'),
          description: language === 'ar' ? 'تم إضافة الخطة بنجاح' : 'Plan added successfully',
        });
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      year: new Date().getFullYear(),
      department: '',
      budget: '',
      status: 'active'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {plan 
              ? (language === 'ar' ? 'تعديل خطة صيانة' : 'Edit Maintenance Plan')
              : (language === 'ar' ? 'إضافة خطة صيانة' : 'Add Maintenance Plan')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{language === 'ar' ? 'الرمز' : 'Code'}</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                disabled
              />
            </div>

            <div>
              <Label>{language === 'ar' ? 'السنة' : 'Year'} *</Label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                required
                min="2020"
                max="2100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} *</Label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>{language === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{language === 'ar' ? 'القسم' : 'Department'}</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <div>
              <Label>{language === 'ar' ? 'الميزانية' : 'Budget'}</Label>
              <Input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
