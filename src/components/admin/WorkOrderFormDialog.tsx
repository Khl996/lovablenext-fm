import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LocationPicker, LocationValue } from '@/components/LocationPicker';

type WorkOrderFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function WorkOrderFormDialog({ open, onOpenChange, onSuccess }: WorkOrderFormProps) {
  const { language } = useLanguage();
  const { user, hospitalId } = useCurrentUser();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    issue_type: '',
    description: '',
    priority: 'medium',
    urgency: '',
    location: {
      hospitalId: null,
      buildingId: null,
      floorId: null,
      departmentId: null,
      roomId: null,
    } as LocationValue,
  });

  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  useEffect(() => {
    if (open && hospitalId) {
      loadTeams();
    }
  }, [open, hospitalId]);

  const loadTeams = async () => {
    if (!hospitalId) return;
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, name_ar')
        .eq('hospital_id', hospitalId)
        .eq('status', 'active');
      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const generateCode = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `WO-${year}${month}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.issue_type || !formData.description) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const code = generateCode();
      const { error } = await supabase.from('work_orders').insert([{
        code,
        hospital_id: hospitalId!,
        issue_type: formData.issue_type,
        description: formData.description,
        priority: formData.priority as any,
        urgency: formData.urgency || null,
        status: 'pending' as any,
        reported_by: user?.id!,
        building_id: formData.location.buildingId || null,
        floor_id: formData.location.floorId || null,
        department_id: formData.location.departmentId || null,
        room_id: formData.location.roomId || null,
        assigned_team: selectedTeam || null,
      }]);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الإنشاء' : 'Created',
        description: language === 'ar' ? 'تم إنشاء أمر العمل بنجاح' : 'Work order created successfully',
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        issue_type: '',
        description: '',
        priority: 'medium',
        urgency: '',
        location: { hospitalId: null, buildingId: null, floorId: null, departmentId: null, roomId: null },
      });
      setSelectedTeam('');
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{language === 'ar' ? 'إضافة أمر عمل جديد' : 'Add New Work Order'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نوع البلاغ' : 'Issue Type'} *</Label>
            <Input
              value={formData.issue_type}
              onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'وصف المشكلة' : 'Description'} *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الأولوية' : 'Priority'}</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{language === 'ar' ? 'منخفضة' : 'Low'}</SelectItem>
                  <SelectItem value="medium">{language === 'ar' ? 'متوسطة' : 'Medium'}</SelectItem>
                  <SelectItem value="high">{language === 'ar' ? 'عالية' : 'High'}</SelectItem>
                  <SelectItem value="urgent">{language === 'ar' ? 'عاجلة' : 'Urgent'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع العمل' : 'Work Type'}</Label>
              <Select value={formData.urgency} onValueChange={(value) => setFormData({ ...formData, urgency: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر النوع' : 'Select type'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">{language === 'ar' ? 'طارئ' : 'Emergency'}</SelectItem>
                  <SelectItem value="routine">{language === 'ar' ? 'دوري' : 'Routine'}</SelectItem>
                  <SelectItem value="preventive">{language === 'ar' ? 'وقائي' : 'Preventive'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الموقع' : 'Location'}</Label>
            <LocationPicker
              value={formData.location}
              onChange={(location) => setFormData({ ...formData, location })}
              showHospital={false}
              required={false}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تعيين للفريق' : 'Assign to Team'}</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر فريق' : 'Select team'} />
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

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit">{language === 'ar' ? 'حفظ' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
