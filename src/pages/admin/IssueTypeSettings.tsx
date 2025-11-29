import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';

export default function IssueTypeSettings() {
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

  const [mappings, setMappings] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<any>(null);
  const [formData, setFormData] = useState({
    issue_type: '',
    issue_type_ar: '',
    team_id: '',
    is_default: false,
  });

  useEffect(() => {
    if (hospitalId) {
      loadMappings();
      loadTeams();
    }
  }, [hospitalId]);

  const loadMappings = async () => {
    if (!hospitalId) return;
    try {
      const { data, error } = await supabase
        .from('issue_type_team_mapping')
        .select('*, teams(id, name, name_ar)')
        .eq('hospital_id', hospitalId)
        .order('issue_type');
      if (error) throw error;
      setMappings(data || []);
    } catch (error) {
      console.error('Error loading mappings:', error);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.issue_type || !formData.issue_type_ar || !formData.team_id) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingMapping) {
        const { error } = await supabase
          .from('issue_type_team_mapping')
          .update({
            issue_type: formData.issue_type,
            issue_type_ar: formData.issue_type_ar,
            team_id: formData.team_id,
            is_default: formData.is_default,
          })
          .eq('id', editingMapping.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('issue_type_team_mapping')
          .insert([{
            hospital_id: hospitalId!,
            issue_type: formData.issue_type,
            issue_type_ar: formData.issue_type_ar,
            team_id: formData.team_id,
            is_default: formData.is_default,
          }]);
        if (error) throw error;
      }

      toast({
        title: language === 'ar' ? 'نجح' : 'Success',
        description: editingMapping
          ? (language === 'ar' ? 'تم تحديث الربط بنجاح' : 'Mapping updated successfully')
          : (language === 'ar' ? 'تم إضافة الربط بنجاح' : 'Mapping added successfully'),
      });

      setDialogOpen(false);
      setEditingMapping(null);
      setFormData({ issue_type: '', issue_type_ar: '', team_id: '', is_default: false });
      loadMappings();
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
        .from('issue_type_team_mapping')
        .delete()
        .eq('id', id);
      if (error) throw error;

      toast({
        title: language === 'ar' ? 'نجح' : 'Success',
        description: language === 'ar' ? 'تم حذف الربط بنجاح' : 'Mapping deleted successfully',
      });
      loadMappings();
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (mapping: any) => {
    setEditingMapping(mapping);
    setFormData({
      issue_type: mapping.issue_type,
      issue_type_ar: mapping.issue_type_ar,
      team_id: mapping.team_id,
      is_default: mapping.is_default || false,
    });
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingMapping(null);
    setFormData({ issue_type: '', issue_type_ar: '', team_id: '', is_default: false });
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{language === 'ar' ? 'أنواع البلاغات' : 'Issue Types'}</h1>
          <p className="text-muted-foreground mt-2">
            {language === 'ar' ? 'إدارة أنواع البلاغات والفرق المختصة بكل نوع' : 'Manage issue types and their assigned specialized teams'}
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'إضافة ربط جديد' : 'Add Mapping'}
        </Button>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{language === 'ar' ? 'نوع البلاغ (EN)' : 'Issue Type (EN)'}</TableHead>
              <TableHead>{language === 'ar' ? 'نوع البلاغ (AR)' : 'Issue Type (AR)'}</TableHead>
              <TableHead>{language === 'ar' ? 'الفريق المعين' : 'Assigned Team'}</TableHead>
              <TableHead>{language === 'ar' ? 'افتراضي' : 'Default'}</TableHead>
              <TableHead className="text-right">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {language === 'ar' ? 'لا توجد روابط حتى الآن' : 'No mappings yet'}
                </TableCell>
              </TableRow>
            ) : (
              mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>{mapping.issue_type}</TableCell>
                  <TableCell>{mapping.issue_type_ar}</TableCell>
                  <TableCell>{language === 'ar' ? mapping.teams?.name_ar : mapping.teams?.name}</TableCell>
                  <TableCell>
                    {mapping.is_default && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {language === 'ar' ? 'افتراضي' : 'Default'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(mapping)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(mapping.id)}>
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
              {editingMapping
                ? (language === 'ar' ? 'تعديل الربط' : 'Edit Mapping')
                : (language === 'ar' ? 'إضافة ربط جديد' : 'Add New Mapping')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع البلاغ (بالإنجليزية)' : 'Issue Type (English)'} *</Label>
              <Input
                value={formData.issue_type}
                onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
                placeholder="electrical"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'نوع البلاغ (بالعربية)' : 'Issue Type (Arabic)'} *</Label>
              <Input
                value={formData.issue_type_ar}
                onChange={(e) => setFormData({ ...formData, issue_type_ar: e.target.value })}
                placeholder="كهرباء"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الفريق المعين' : 'Assigned Team'} *</Label>
              <Select value={formData.team_id} onValueChange={(value) => setFormData({ ...formData, team_id: value })}>
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

            <div className="flex items-center justify-between">
              <Label>{language === 'ar' ? 'جعله افتراضي' : 'Set as Default'}</Label>
              <Switch
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit">
                {editingMapping
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
