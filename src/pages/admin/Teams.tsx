import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Search, Pencil, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type Team = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  department: string | null;
  type: string;
  status: string;
  hospital_id: string;
  created_at: string;
};

export default function Teams() {
  const { t, language } = useLanguage();
  const { hospitalId, permissions } = useCurrentUser();
  const { toast } = useToast();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    department: '',
    type: 'internal',
    status: 'active',
  });

  const canManage = permissions.hasPermission('teams.manage');

  useEffect(() => {
    if (hospitalId) {
      loadTeams();
    }
  }, [hospitalId]);

  const loadTeams = async () => {
    if (!hospitalId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name || !formData.name_ar) {
      toast({
        title: t('error'),
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingTeam) {
        const { error } = await supabase
          .from('teams')
          .update(formData)
          .eq('id', editingTeam.id);
        if (error) throw error;
        toast({
          title: language === 'ar' ? 'تم التحديث' : 'Updated',
          description: language === 'ar' ? 'تم تحديث الفريق بنجاح' : 'Team updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('teams')
          .insert({ ...formData, hospital_id: hospitalId });
        if (error) throw error;
        toast({
          title: language === 'ar' ? 'تم الإضافة' : 'Added',
          description: language === 'ar' ? 'تم إضافة الفريق بنجاح' : 'Team added successfully',
        });
      }
      setDialogOpen(false);
      setEditingTeam(null);
      setFormData({ code: '', name: '', name_ar: '', department: '', type: 'internal', status: 'active' });
      loadTeams();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      code: team.code,
      name: team.name,
      name_ar: team.name_ar,
      department: team.department || '',
      type: team.type,
      status: team.status,
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (team: Team) => {
    setTeamToDelete(team);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamToDelete.id);
      if (error) throw error;
      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف الفريق بنجاح' : 'Team deleted successfully',
      });
      loadTeams();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    }
  };

  const filteredTeams = teams.filter(team =>
    team.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.name_ar.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!permissions.hasPermission('view_teams')) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('accessDenied')}</h3>
          <p className="text-muted-foreground">{t('noPermission')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{language === 'ar' ? 'الفرق' : 'Teams'}</h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'إدارة فرق الصيانة والعمل' : 'Manage maintenance and work teams'}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditingTeam(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'إضافة فريق' : 'Add Team'}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <Card key={team.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {language === 'ar' ? team.name_ar : team.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{team.code}</p>
                  </div>
                </div>
                <Badge variant={team.status === 'active' ? 'default' : 'secondary'}>
                  {team.status === 'active' 
                    ? (language === 'ar' ? 'نشط' : 'Active') 
                    : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{language === 'ar' ? 'النوع' : 'Type'}:</span>
                  <span>{team.type === 'internal' ? (language === 'ar' ? 'داخلي' : 'Internal') : (language === 'ar' ? 'خارجي' : 'External')}</span>
                </div>
                {team.department && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{language === 'ar' ? 'القسم' : 'Department'}:</span>
                    <span>{team.department}</span>
                  </div>
                )}
                {canManage && (
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(team)} className="flex-1">
                      <Pencil className="h-3 w-3 mr-1" />
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteClick(team)} className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {language === 'ar' ? 'لا توجد فرق' : 'No teams found'}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeam 
                ? (language === 'ar' ? 'تعديل الفريق' : 'Edit Team')
                : (language === 'ar' ? 'إضافة فريق جديد' : 'Add New Team')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الرمز' : 'Code'}</Label>
              <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (English)' : 'Name (English)'}</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
              <Input value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'القسم' : 'Department'}</Label>
              <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">{language === 'ar' ? 'داخلي' : 'Internal'}</SelectItem>
                  <SelectItem value="external">{language === 'ar' ? 'خارجي' : 'External'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                  <SelectItem value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit">{language === 'ar' ? 'حفظ' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد من حذف هذا الفريق؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this team? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
