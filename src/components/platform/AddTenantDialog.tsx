import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AddTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddTenantDialog({ open, onOpenChange, onSuccess }: AddTenantDialogProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    slug: '',
    email: '',
    phone: '',
    plan_id: '',
  });
  const [plans, setPlans] = useState<any[]>([]);

  useState(() => {
    if (open) {
      fetchPlans();
    }
  });

  const fetchPlans = async () => {
    try {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');

      if (data) {
        setPlans(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, plan_id: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.name_ar || !formData.slug || !formData.email) {
      toast.error(language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: formData.name,
          name_ar: formData.name_ar,
          slug: formData.slug,
          email: formData.email,
          phone: formData.phone,
          plan_id: formData.plan_id || null,
          subscription_status: 'trial',
          subscription_starts_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          max_users: 5,
          max_assets: 100,
          max_storage_mb: 1024,
          enabled_modules: JSON.stringify(['work_orders', 'assets', 'locations', 'maintenance']),
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      toast.success(
        language === 'ar'
          ? 'تم إنشاء المؤسسة بنجاح'
          : 'Organization created successfully'
      );

      setFormData({
        name: '',
        name_ar: '',
        slug: '',
        email: '',
        phone: '',
        plan_id: '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast.error(
        error.message ||
        (language === 'ar' ? 'فشل إنشاء المؤسسة' : 'Failed to create organization')
      );
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: prev.slug || generateSlug(value),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {language === 'ar' ? 'إضافة مؤسسة جديدة' : 'Add New Organization'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar'
              ? 'أدخل معلومات المؤسسة الجديدة. سيتم إنشاء فترة تجريبية لمدة 30 يوم.'
              : 'Enter the new organization information. A 30-day trial period will be created.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                {language === 'ar' ? 'الاسم (English)' : 'Name (English)'}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme Hospital"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_ar">
                {language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="مستشفى أكمي"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">
              {language === 'ar' ? 'المعرف الفريد' : 'Slug'}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="acme-hospital"
              required
            />
            <p className="text-xs text-muted-foreground">
              {language === 'ar'
                ? 'سيستخدم في الروابط والمعرفات. حروف إنجليزية صغيرة وأرقام فقط'
                : 'Used in URLs and identifiers. Lowercase letters and numbers only'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@acme.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                {language === 'ar' ? 'رقم الهاتف' : 'Phone'}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+966 50 123 4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">
              {language === 'ar' ? 'خطة الاشتراك' : 'Subscription Plan'}
            </Label>
            <Select
              value={formData.plan_id}
              onValueChange={(value) => setFormData({ ...formData, plan_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر خطة' : 'Select plan'} />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {language === 'ar' ? plan.name_ar : plan.name} - $
                    {plan.price_monthly}/
                    {language === 'ar' ? 'شهر' : 'month'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {language === 'ar'
                ? 'ستبدأ المؤسسة بفترة تجريبية 30 يوم ثم تتحول للخطة المختارة'
                : 'Organization will start with 30-day trial then switch to selected plan'}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {language === 'ar' ? 'إنشاء المؤسسة' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
