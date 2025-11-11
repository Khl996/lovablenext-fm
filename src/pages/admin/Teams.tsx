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
import { Plus, Users, Search, Pencil, Trash2, UserPlus } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';

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

type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  specialization: string[] | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
};

type Specialization = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  category: string;
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

  // Team members state
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [memberFormData, setMemberFormData] = useState({
    user_id: '',
    role: 'technician',
    specialization: [] as string[],
  });

  const canManage = permissions.hasPermission('teams.manage');

  useEffect(() => {
    if (hospitalId) {
      loadTeams();
      loadSpecializations();
    }
  }, [hospitalId]);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers();
      loadAvailableUsers();
    }
  }, [selectedTeam]);

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

  const loadSpecializations = async () => {
    if (!hospitalId) return;
    try {
      const { data, error } = await supabase
        .from('specializations')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('name');

      if (error) throw error;
      setSpecializations(data || []);
    } catch (error: any) {
      console.error('Error loading specializations:', error);
    }
  };

  const loadTeamMembers = async () => {
    if (!selectedTeam) return;
    try {
      // Load team members with user profiles
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('id, team_id, user_id, role, specialization')
        .eq('team_id', selectedTeam.id);

      if (membersError) throw membersError;

      // Load profiles for these users
      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Combine data
        const membersWithProfiles = members.map(member => ({
          ...member,
          profiles: profiles?.find(p => p.id === member.user_id) || null
        }));

        setTeamMembers(membersWithProfiles as TeamMember[]);
      } else {
        setTeamMembers([]);
      }
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadAvailableUsers = async () => {
    if (!hospitalId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('hospital_id', hospitalId);

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
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

  const handleViewMembers = (team: Team) => {
    setSelectedTeam(team);
    setMembersDialogOpen(true);
  };

  const handleAddMember = () => {
    setEditingMember(null);
    setMemberFormData({
      user_id: '',
      role: 'technician',
      specialization: [],
    });
    setMemberFormOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setMemberFormData({
      user_id: member.user_id,
      role: member.role,
      specialization: member.specialization || [],
    });
    setMemberFormOpen(true);
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !memberFormData.user_id) {
      toast({
        title: t('error'),
        description: language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingMember) {
        const { error } = await supabase
          .from('team_members')
          .update({
            role: memberFormData.role,
            specialization: memberFormData.specialization,
          })
          .eq('id', editingMember.id);

        if (error) throw error;

        toast({
          title: language === 'ar' ? 'تم التحديث' : 'Updated',
          description: language === 'ar' ? 'تم تحديث العضو بنجاح' : 'Member updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('team_members')
          .insert({
            team_id: selectedTeam.id,
            user_id: memberFormData.user_id,
            role: memberFormData.role,
            specialization: memberFormData.specialization,
          });

        if (error) throw error;

        toast({
          title: language === 'ar' ? 'تم الإضافة' : 'Added',
          description: language === 'ar' ? 'تم إضافة العضو بنجاح' : 'Member added successfully',
        });
      }

      setMemberFormOpen(false);
      loadTeamMembers();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف العضو بنجاح' : 'Member deleted successfully',
      });

      loadTeamMembers();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleSpecialization = (specCode: string) => {
    setMemberFormData(prev => ({
      ...prev,
      specialization: prev.specialization.includes(specCode)
        ? prev.specialization.filter(s => s !== specCode)
        : [...prev.specialization, specCode]
    }));
  };

  const getSpecializationName = (code: string) => {
    const spec = specializations.find(s => s.code === code);
    if (!spec) return code;
    return language === 'ar' ? spec.name_ar : spec.name;
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
                    <Button variant="outline" size="sm" onClick={() => handleViewMembers(team)} className="flex-1">
                      <UserPlus className="h-3 w-3 mr-1" />
                      {language === 'ar' ? 'الأعضاء' : 'Members'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(team)}>
                      <Pencil className="h-3 w-3" />
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

      {/* Team Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'أعضاء فريق: ' : 'Team Members: '}
              {selectedTeam && (language === 'ar' ? selectedTeam.name_ar : selectedTeam.name)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button onClick={handleAddMember} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إضافة عضو جديد' : 'Add New Member'}
            </Button>

            {teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'لا يوجد أعضاء في هذا الفريق' : 'No members in this team'}
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{member.profiles?.full_name || 'Unknown'}</h4>
                          <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                          <div className="mt-2">
                            <Badge variant="outline" className="mr-2">
                              {member.role === 'technician' 
                                ? (language === 'ar' ? 'فني' : 'Technician')
                                : member.role === 'supervisor'
                                ? (language === 'ar' ? 'مشرف' : 'Supervisor')
                                : member.role}
                            </Badge>
                          </div>
                          {member.specialization && member.specialization.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {member.specialization.map((spec, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {getSpecializationName(spec)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditMember(member)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteMember(member.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Member Dialog */}
      <Dialog open={memberFormOpen} onOpenChange={setMemberFormOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMember
                ? (language === 'ar' ? 'تعديل عضو' : 'Edit Member')
                : (language === 'ar' ? 'إضافة عضو جديد' : 'Add New Member')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMemberSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المستخدم' : 'User'}</Label>
              <Select
                value={memberFormData.user_id}
                onValueChange={(value) => setMemberFormData({ ...memberFormData, user_id: value })}
                disabled={!!editingMember}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر مستخدم' : 'Select user'} />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الدور' : 'Role'}</Label>
              <Select
                value={memberFormData.role}
                onValueChange={(value) => setMemberFormData({ ...memberFormData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technician">{language === 'ar' ? 'فني' : 'Technician'}</SelectItem>
                  <SelectItem value="supervisor">{language === 'ar' ? 'مشرف' : 'Supervisor'}</SelectItem>
                  <SelectItem value="lead">{language === 'ar' ? 'قائد الفريق' : 'Team Lead'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'التخصصات' : 'Specializations'}</Label>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                {specializations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {language === 'ar' ? 'لا توجد تخصصات متاحة' : 'No specializations available'}
                  </p>
                ) : (
                  specializations.map((spec) => (
                    <div key={spec.id} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={spec.code}
                        checked={memberFormData.specialization.includes(spec.code)}
                        onCheckedChange={() => toggleSpecialization(spec.code)}
                      />
                      <label
                        htmlFor={spec.code}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {language === 'ar' ? spec.name_ar : spec.name}
                        <span className="text-muted-foreground ml-2">({spec.code})</span>
                      </label>
                      <Badge variant="outline" className="text-xs">
                        {spec.category}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setMemberFormOpen(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit">{language === 'ar' ? 'حفظ' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
