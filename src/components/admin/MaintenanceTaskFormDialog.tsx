import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';

type MaintenanceTaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  task?: any;
};

type ChecklistItem = {
  id: string;
  title: string;
  completed: boolean;
};

export function MaintenanceTaskFormDialog({ open, onOpenChange, onSuccess, task }: MaintenanceTaskFormDialogProps) {
  const { t, language } = useLanguage();
  const { hospitalId } = useCurrentUser();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    plan_id: '',
    type: 'preventive',
    frequency: 'monthly',
    start_date: '',
    end_date: '',
    duration_days: 1,
    assigned_to: '',
    is_critical: false,
    status: 'scheduled'
  });

  useEffect(() => {
    if (open && hospitalId) {
      loadPlans();
      loadTeams();
      loadAssets();
      if (task) {
        setFormData({
          code: task.code || '',
          name: task.name || '',
          name_ar: task.name_ar || '',
          plan_id: task.plan_id || '',
          type: task.type || 'preventive',
          frequency: task.frequency || 'monthly',
          start_date: task.start_date || '',
          end_date: task.end_date || '',
          duration_days: task.duration_days || 1,
          assigned_to: task.assigned_to || '',
          is_critical: task.is_critical || false,
          status: task.status || 'scheduled'
        });
        if (task.checklist) {
          setChecklist(Array.isArray(task.checklist) ? task.checklist : []);
        }
      } else {
        generateCode();
      }
    }
  }, [open, hospitalId, task]);

  const loadPlans = async () => {
    const { data } = await supabase
      .from('maintenance_plans')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'active')
      .order('year', { ascending: false });
    
    if (data) setPlans(data);
  };

  const loadTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'active')
      .order('name');
    
    if (data) setTeams(data);
  };

  const loadAssets = async () => {
    const { data } = await supabase
      .from('assets')
      .select('id, code, name, name_ar')
      .eq('hospital_id', hospitalId)
      .eq('status', 'active')
      .order('name');
    
    if (data) setAssets(data);
  };

  const generateCode = async () => {
    const { data: latestTask } = await supabase
      .from('maintenance_tasks')
      .select('code')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (latestTask?.code) {
      const match = latestTask.code.match(/MT-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const code = `MT-${nextNumber.toString().padStart(5, '0')}`;
    setFormData(prev => ({ ...prev, code }));
  };

  const addChecklistItem = () => {
    setChecklist([...checklist, {
      id: crypto.randomUUID(),
      title: '',
      completed: false
    }]);
  };

  const updateChecklistItem = (id: string, title: string) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, title } : item
    ));
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.name_ar || !formData.plan_id || !formData.start_date || !formData.end_date) {
      toast({
        title: t('error'),
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const taskData: any = {
        code: formData.code,
        name: formData.name,
        name_ar: formData.name_ar,
        plan_id: formData.plan_id,
        type: formData.type as 'preventive' | 'corrective' | 'predictive' | 'routine',
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date,
        duration_days: formData.duration_days,
        assigned_to: formData.assigned_to || null,
        is_critical: formData.is_critical,
        status: formData.status,
        checklist: checklist.filter(item => item.title.trim() !== '') as any
      };

      if (task) {
        const { error } = await supabase
          .from('maintenance_tasks')
          .update(taskData)
          .eq('id', task.id);

        if (error) throw error;

        toast({
          title: t('success'),
          description: language === 'ar' ? 'تم تحديث المهمة بنجاح' : 'Task updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('maintenance_tasks')
          .insert([taskData]);

        if (error) throw error;

        toast({
          title: t('success'),
          description: language === 'ar' ? 'تم إضافة المهمة بنجاح' : 'Task added successfully',
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
      plan_id: '',
      type: 'preventive',
      frequency: 'monthly',
      start_date: '',
      end_date: '',
      duration_days: 1,
      assigned_to: '',
      is_critical: false,
      status: 'scheduled'
    });
    setChecklist([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task 
              ? (language === 'ar' ? 'تعديل مهمة صيانة' : 'Edit Maintenance Task')
              : (language === 'ar' ? 'إضافة مهمة صيانة' : 'Add Maintenance Task')}
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
              <Label>{language === 'ar' ? 'الخطة' : 'Plan'} *</Label>
              <Select
                value={formData.plan_id}
                onValueChange={(value) => setFormData({ ...formData, plan_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الخطة' : 'Select plan'} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {language === 'ar' ? plan.name_ar : plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>{language === 'ar' ? 'النوع' : 'Type'} *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">{language === 'ar' ? 'وقائية' : 'Preventive'}</SelectItem>
                  <SelectItem value="corrective">{language === 'ar' ? 'تصحيحية' : 'Corrective'}</SelectItem>
                  <SelectItem value="predictive">{language === 'ar' ? 'تنبؤية' : 'Predictive'}</SelectItem>
                  <SelectItem value="routine">{language === 'ar' ? 'روتينية' : 'Routine'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{language === 'ar' ? 'التكرار' : 'Frequency'} *</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{language === 'ar' ? 'يومي' : 'Daily'}</SelectItem>
                  <SelectItem value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
                  <SelectItem value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</SelectItem>
                  <SelectItem value="quarterly">{language === 'ar' ? 'ربع سنوي' : 'Quarterly'}</SelectItem>
                  <SelectItem value="yearly">{language === 'ar' ? 'سنوي' : 'Yearly'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>{language === 'ar' ? 'تاريخ البداية' : 'Start Date'} *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>{language === 'ar' ? 'تاريخ النهاية' : 'End Date'} *</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>{language === 'ar' ? 'المدة (أيام)' : 'Duration (days)'}</Label>
              <Input
                type="number"
                value={formData.duration_days}
                onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>
          </div>

          <div>
            <Label>{language === 'ar' ? 'الفريق المسؤول' : 'Assigned Team'}</Label>
            <Select
              value={formData.assigned_to}
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر الفريق' : 'Select team'} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {language === 'ar' ? team.name_ar : team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="critical"
              checked={formData.is_critical}
              onCheckedChange={(checked) => setFormData({ ...formData, is_critical: checked as boolean })}
            />
            <Label htmlFor="critical" className="cursor-pointer">
              {language === 'ar' ? 'مهمة حرجة' : 'Critical Task'}
            </Label>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{language === 'ar' ? 'قائمة المراجعة' : 'Checklist'}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إضافة بند' : 'Add Item'}
              </Button>
            </div>
            {checklist.map((item) => (
              <div key={item.id} className="flex gap-2">
                <Input
                  value={item.title}
                  onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                  placeholder={language === 'ar' ? 'عنوان البند' : 'Item title'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeChecklistItem(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
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
