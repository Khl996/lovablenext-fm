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
import { useLookupTables, getLookupName } from '@/hooks/useLookupTables';

type WorkOrderFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function WorkOrderFormDialog({ open, onOpenChange, onSuccess }: WorkOrderFormProps) {
  const { language } = useLanguage();
  const { user, hospitalId, profile } = useCurrentUser();
  const { toast } = useToast();

  const { lookups, loading: lookupsLoading } = useLookupTables(['priorities', 'work_types']);
  const [issueTypeMappings, setIssueTypeMappings] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    issue_type: '',
    description: '',
    priority: '',
    urgency: '',
    asset_id: '',
    company_id: '',
    location: {
      hospitalId: null,
      buildingId: null,
      floorId: null,
      departmentId: null,
      roomId: null,
    } as LocationValue,
    customLocation: '', // For "Other" location option
  });

  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);

  // Set default priority when lookups are loaded
  useEffect(() => {
    if (lookups.priorities && lookups.priorities.length > 0 && !formData.priority) {
      const defaultPriority = lookups.priorities.find(p => p.code === 'medium') || lookups.priorities[0];
      setFormData(prev => ({ ...prev, priority: defaultPriority.code }));
    }
  }, [lookups.priorities]);

  useEffect(() => {
    if (open && hospitalId) {
      loadTeams();
      loadIssueTypeMappings();
      loadAssets();
      loadCompanies();
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

  const loadIssueTypeMappings = async () => {
    if (!hospitalId) return;
    try {
      const { data, error } = await supabase
        .from('issue_type_team_mapping')
        .select('*, teams(id, name, name_ar)')
        .eq('hospital_id', hospitalId);
      if (error) throw error;
      setIssueTypeMappings(data || []);
    } catch (error) {
      console.error('Error loading issue type mappings:', error);
    }
  };

  const loadAssets = async () => {
    if (!hospitalId) return;
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, code, name, name_ar')
        .eq('hospital_id', hospitalId)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  const loadCompanies = async () => {
    if (!hospitalId) return;
    try {
      const { data, error } = await (supabase as any)
        .from('companies')
        .select('id, name, name_ar, logo_url')
        .eq('hospital_id', hospitalId)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  // Auto-assign team based on issue type mapping
  const handleIssueTypeChange = (value: string) => {
    setFormData({ ...formData, issue_type: value });
    
    // Find mapping for this issue type
    const mapping = issueTypeMappings.find(m => m.issue_type === value);
    if (mapping) {
      setSelectedTeam(mapping.team_id);
    } else {
      // Clear team selection if no mapping found
      setSelectedTeam('');
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
    if (!hospitalId) return '';

    try {
      // Get hospital code
      const { data: hospital } = await supabase
        .from('hospitals')
        .select('code')
        .eq('id', hospitalId)
        .single();

      const hospitalCode = hospital?.code || 'HOS';
      
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      
      // Get count of work orders today
      const { count } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId)
        .gte('created_at', `${year}-${month}-${day}T00:00:00`)
        .lt('created_at', `${year}-${month}-${day}T23:59:59`);

      const sequential = ((count || 0) + 1).toString().padStart(4, '0');
      return `${hospitalCode}-${year}${month}${day}-${sequential}`;
    } catch (error) {
      console.error('Error generating work order code:', error);
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      return `WO-${year}${month}${day}-0001`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !hospitalId || !profile) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'You must be logged in',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.issue_type || !formData.description) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const code = await generateCode();
      
      // TODO: Upload photos to storage first, then save URLs
      // For now, we'll skip photos to avoid errors
      
      const { data: newWorkOrder, error } = await supabase.from('work_orders').insert([{
        code,
        hospital_id: hospitalId!,
        issue_type: formData.issue_type,
        description: `${formData.description}\n\n${language === 'ar' ? 'المبلغ' : 'Reporter'}: ${profile.full_name}${profile.phone ? `\n${language === 'ar' ? 'رقم التواصل' : 'Contact'}: ${profile.phone}` : ''}`,
        priority: formData.priority as any,
        urgency: formData.urgency || null,
        status: 'pending' as any,
        reported_by: user?.id!,
        asset_id: formData.asset_id || null,
        building_id: formData.location.buildingId || null,
        floor_id: formData.location.floorId || null,
        department_id: formData.location.departmentId || null,
        room_id: formData.location.roomId || null,
        assigned_team: selectedTeam || null,
        company_id: formData.company_id || null,
        photos: null,
      }]).select().single();

      if (error) throw error;

      // Send email notification to team members
      if (newWorkOrder?.id && selectedTeam) {
        console.log('Sending email notification for work order:', newWorkOrder.id);
        try {
          const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-work-order-email', {
            body: {
              workOrderId: newWorkOrder.id,
              eventType: 'new_work_order',
            },
          });
          
          if (emailError) {
            console.error('Email notification error:', emailError);
          } else {
            console.log('Email notification sent successfully:', emailResult);
          }
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
          // Don't fail the whole operation if email fails
        }
      } else {
        console.log('Skipping email: newWorkOrder =', newWorkOrder?.id, 'selectedTeam =', selectedTeam);
      }

      toast({
        title: language === 'ar' ? 'تم الإنشاء' : 'Created',
        description: language === 'ar' ? 'تم إنشاء البلاغ بنجاح' : 'Maintenance report created successfully',
      });

      onSuccess();
      onOpenChange(false);
      const defaultPriority = lookups.priorities?.find(p => p.code === 'medium')?.code || '';
      setFormData({
        issue_type: '',
        description: '',
        priority: defaultPriority,
        urgency: '',
        asset_id: '',
        company_id: '',
        location: { hospitalId: null, buildingId: null, floorId: null, departmentId: null, roomId: null },
        customLocation: '',
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
                {issueTypeMappings.length > 0 ? (
                  issueTypeMappings.map((mapping) => (
                    <SelectItem key={mapping.id} value={mapping.issue_type}>
                      {language === 'ar' ? mapping.issue_type_ar : mapping.issue_type}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="placeholder" disabled>
                    {language === 'ar' ? 'لا توجد أنواع بلاغات متاحة' : 'No issue types available'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {issueTypeMappings.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'يرجى إضافة أنواع البلاغات من صفحة الإعدادات' : 'Please add issue types from Settings page'}
              </p>
            )}
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
                  <SelectValue placeholder={language === 'ar' ? 'اختر الأولوية' : 'Select priority'} />
                </SelectTrigger>
                <SelectContent>
                  {lookups.priorities?.map((priority) => (
                    <SelectItem key={priority.code} value={priority.code}>
                      {getLookupName(priority, language)}
                    </SelectItem>
                  ))}
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
                  {lookups.work_types?.map((workType) => (
                    <SelectItem key={workType.code} value={workType.code}>
                      {getLookupName(workType, language)}
                    </SelectItem>
                  ))}
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
            <div className="mt-2">
              <Label>{language === 'ar' ? 'أو أدخل موقع آخر' : 'Or enter custom location'}</Label>
              <Input
                value={formData.customLocation}
                onChange={(e) => setFormData({ ...formData, customLocation: e.target.value })}
                placeholder={language === 'ar' ? 'مثل: عيادة خارجية - الدور الأرضي' : 'e.g., External Clinic - Ground Floor'}
                className="mt-1"
              />
            </div>
          </div>

          {/* Reporter Information - Auto-filled */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {language === 'ar' ? 'معلومات المبلغ' : 'Reporter Information'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم المبلغ' : 'Reporter Name'}</Label>
                <div className="px-3 py-2 bg-muted rounded-md text-muted-foreground">
                  {profile?.full_name || user?.email || '-'}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'رقم التواصل' : 'Contact Number'}</Label>
                <div className="px-3 py-2 bg-muted rounded-md text-muted-foreground">
                  {profile?.phone || (language === 'ar' ? 'غير محدد' : 'Not specified')}
                </div>
              </div>
            </div>
          </div>

          {/* Asset Selection */}
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الأصل' : 'Asset'}</Label>
            <Select
              value={formData.asset_id || 'none'}
              onValueChange={(value) => setFormData({ ...formData, asset_id: value === 'none' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر الأصل (اختياري)' : 'Select Asset (optional)'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{language === 'ar' ? 'بدون أصل' : 'No Asset'}</SelectItem>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {language === 'ar' ? asset.name_ar || asset.name : asset.name} ({asset.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Company Selection */}
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الشركة المسؤولة' : 'Responsible Company'}</Label>
            <Select
              value={formData.company_id || 'none'}
              onValueChange={(value) => setFormData({ ...formData, company_id: value === 'none' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر الشركة (اختياري)' : 'Select Company (optional)'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{language === 'ar' ? 'بدون شركة محددة' : 'No specific company'}</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {language === 'ar' ? company.name_ar : company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {companies.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {language === 'ar' ? 'لا توجد شركات متعاقدة. يرجى إضافتها من صفحة الإعدادات' : 'No contracted companies. Please add them from Settings'}
              </p>
            )}
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
