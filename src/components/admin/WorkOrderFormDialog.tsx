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
import { Upload, X } from 'lucide-react';

type WorkOrderFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function WorkOrderFormDialog({ open, onOpenChange, onSuccess }: WorkOrderFormProps) {
  const { language } = useLanguage();
  const { user, hospitalId } = useCurrentUser();
  const { toast } = useToast();

  const issueTypes = [
    { value: 'electrical', labelAr: 'كهرباء', labelEn: 'Electrical', department: 'electrical' },
    { value: 'hvac', labelAr: 'تكييف وتبريد', labelEn: 'HVAC', department: 'hvac' },
    { value: 'plumbing', labelAr: 'سباكة', labelEn: 'Plumbing', department: 'plumbing' },
    { value: 'building', labelAr: 'مباني وإنشاءات', labelEn: 'Building', department: 'civil' },
    { value: 'medical_equipment', labelAr: 'أجهزة طبية', labelEn: 'Medical Equipment', department: 'biomedical' },
    { value: 'cleaning', labelAr: 'نظافة', labelEn: 'Cleaning', department: 'cleaning' },
    { value: 'safety', labelAr: 'السلامة', labelEn: 'Safety', department: 'safety' },
    { value: 'network', labelAr: 'شبكات وتقنية', labelEn: 'Network/IT', department: 'it' },
    { value: 'other', labelAr: 'أخرى', labelEn: 'Other', department: null },
  ];

  const [formData, setFormData] = useState({
    issue_type: '',
    description: '',
    priority: 'medium',
    urgency: '',
    reporter_name: '',
    reporter_contact: '',
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
  const [attachments, setAttachments] = useState<File[]>([]);

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
        .select('id, name, name_ar, department')
        .eq('hospital_id', hospitalId)
        .eq('status', 'active');
      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  // Auto-assign team based on issue type
  const handleIssueTypeChange = (value: string) => {
    setFormData({ ...formData, issue_type: value });
    
    const selectedIssueType = issueTypes.find(t => t.value === value);
    if (selectedIssueType?.department) {
      const matchingTeam = teams.find(t => t.department === selectedIssueType.department);
      if (matchingTeam) {
        setSelectedTeam(matchingTeam.id);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const generateCode = async () => {
    // Format: WO-[HospitalCode]-YYYYMM-####
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    // Get hospital code (first 3 letters or HOS if not available)
    const { data: hospital } = await supabase
      .from('hospitals')
      .select('name')
      .eq('id', hospitalId!)
      .single();
    
    const hospitalCode = hospital?.name?.substring(0, 3).toUpperCase() || 'HOS';
    
    // Get count of work orders this month to generate sequential number
    const { count } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId!)
      .gte('created_at', `${year}-${month}-01`);
    
    const sequential = ((count || 0) + 1).toString().padStart(4, '0');
    return `WO-${hospitalCode}-${year}${month}-${sequential}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.issue_type || !formData.description || !formData.reporter_name || !formData.reporter_contact) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const code = await generateCode();
      
      // Prepare photos array (in real app, you'd upload to storage first)
      const photoUrls = attachments.map(f => URL.createObjectURL(f));
      
      const { error } = await supabase.from('work_orders').insert([{
        code,
        hospital_id: hospitalId!,
        issue_type: formData.issue_type,
        description: `${formData.description}\n\n${language === 'ar' ? 'المبلغ' : 'Reporter'}: ${formData.reporter_name}\n${language === 'ar' ? 'رقم التواصل' : 'Contact'}: ${formData.reporter_contact}`,
        priority: formData.priority as any,
        urgency: formData.urgency || null,
        status: 'pending' as any,
        reported_by: user?.id!,
        building_id: formData.location.buildingId || null,
        floor_id: formData.location.floorId || null,
        department_id: formData.location.departmentId || null,
        room_id: formData.location.roomId || null,
        assigned_team: selectedTeam || null,
        photos: photoUrls.length > 0 ? photoUrls : null,
      }]);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الإنشاء' : 'Created',
        description: language === 'ar' ? 'تم إنشاء البلاغ بنجاح' : 'Maintenance report created successfully',
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        issue_type: '',
        description: '',
        priority: 'medium',
        urgency: '',
        reporter_name: '',
        reporter_contact: '',
        location: { hospitalId: null, buildingId: null, floorId: null, departmentId: null, roomId: null },
      });
      setSelectedTeam('');
      setAttachments([]);
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
          <DialogTitle>{language === 'ar' ? 'بلاغ صيانة جديد' : 'New Maintenance Report'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نوع البلاغ' : 'Issue Type'} *</Label>
            <Select value={formData.issue_type} onValueChange={handleIssueTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر نوع البلاغ' : 'Select issue type'} />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {language === 'ar' ? type.labelAr : type.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اسم المبلغ' : 'Reporter Name'} *</Label>
              <Input
                value={formData.reporter_name}
                onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رقم التواصل' : 'Contact Number'} *</Label>
              <Input
                value={formData.reporter_contact}
                onChange={(e) => setFormData({ ...formData, reporter_contact: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'تعيين للفريق' : 'Assign to Team'}</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'تلقائي حسب نوع البلاغ' : 'Auto-assigned by issue type'} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {language === 'ar' ? team.name_ar : team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTeam && (
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'تم التعيين التلقائي حسب نوع البلاغ' : 'Auto-assigned based on issue type'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المرفقات (صور/ملفات)' : 'Attachments (Images/Files)'}</Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'اضغط لإضافة ملفات' : 'Click to add files'}
                  </p>
                </div>
              </label>
              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit">{language === 'ar' ? 'إرسال البلاغ' : 'Submit Report'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
