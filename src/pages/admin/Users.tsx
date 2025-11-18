import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, User, Search, Filter, Trash2, Clock, Eye } from 'lucide-react';
import { UserDetailsSheet } from '@/components/admin/UserDetailsSheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface UserData {
  id: string;
  full_name: string;
  full_name_ar: string | null;
  email: string;
  phone: string | null;
  hospital_id: string | null;
  hospital_name?: string;
  last_activity_at?: string | null;
  roles: Array<{
    id: string;
    role: string;
    hospital_id: string | null;
    hospital_name?: string;
  }>;
}

interface Hospital {
  id: string;
  name: string;
  name_ar: string;
}

export default function Users() {
  const { language, t } = useLanguage();
  const { isGlobalAdmin, hospitalId: currentUserHospitalId, canManageUsers } = useCurrentUser();
  const [users, setUsers] = useState<UserData[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [lookupRoles, setLookupRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    hospitalId: '',
    role: '',
  });

  useEffect(() => {
    if (canManageUsers) {
      Promise.all([loadUsers(), loadHospitals(), loadLookupRoles()]);
    }
  }, [canManageUsers, isGlobalAdmin, currentUserHospitalId]);

  const loadUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          full_name_ar,
          email,
          phone,
          hospital_id,
          last_activity_at,
          hospitals(name, name_ar)
        `);

      if (profilesError) throw profilesError;

      // Get both old and new roles
      const [rolesResult, customRolesResult] = await Promise.all([
        supabase.from('user_roles').select(`
          id,
          user_id,
          role,
          hospital_id,
          hospitals(name, name_ar)
        `),
        supabase.from('user_custom_roles').select(`
          id,
          user_id,
          role_code,
          hospital_id,
          hospitals(name, name_ar)
        `)
      ]);

      if (rolesResult.error) throw rolesResult.error;
      if (customRolesResult.error) throw customRolesResult.error;

      const usersWithRoles = (profilesData || []).map((profile: any) => {
        const systemRoles = (rolesResult.data || [])
          .filter((r: any) => r.user_id === profile.id)
          .map((r: any) => ({
            id: r.id,
            role: r.role,
            hospital_id: r.hospital_id,
            hospital_name: r.hospitals ? (language === 'ar' ? r.hospitals.name_ar : r.hospitals.name) : null,
            isSystemRole: true,
          }));

        const customRolesList = (customRolesResult.data || [])
          .filter((r: any) => r.user_id === profile.id)
          .map((r: any) => ({
            id: r.id,
            role: r.role_code,
            hospital_id: r.hospital_id,
            hospital_name: r.hospitals ? (language === 'ar' ? r.hospitals.name_ar : r.hospitals.name) : null,
            isSystemRole: false,
          }));

        return {
          id: profile.id,
          full_name: profile.full_name,
          full_name_ar: profile.full_name_ar,
          email: profile.email,
          phone: profile.phone,
          hospital_id: profile.hospital_id,
          hospital_name: profile.hospitals ? (language === 'ar' ? profile.hospitals.name_ar : profile.hospitals.name) : null,
          last_activity_at: profile.last_activity_at,
          roles: [...systemRoles, ...customRolesList],
        };
      });

      // Filter users based on permissions
      const filteredUsers = isGlobalAdmin 
        ? usersWithRoles 
        : usersWithRoles.filter((u: any) => u.hospital_id === currentUserHospitalId);

      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const loadHospitals = async () => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('id, name, name_ar')
        .order('name');

      if (error) throw error;
      setHospitals(data || []);
    } catch (error) {
      console.error('Error loading hospitals:', error);
    }
  };

  const loadLookupRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('system_roles')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      
      // Filter out global_admin from the list (it's handled separately)
      const filteredRoles = (data || []).filter(r => r.code !== 'global_admin');
      setLookupRoles(filteredRoles);
    } catch (error) {
      console.error('Error loading system roles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.fullName || !formData.role) {
      toast.error(t('fillRequired'));
      return;
    }

    try {
      // Call Edge Function to create user without logging out current user
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone,
          hospitalId: formData.role === 'global_admin' ? null : (formData.hospitalId || null),
          roles: [{
            role: formData.role,
            hospitalId: formData.role === 'global_admin' ? null : (formData.hospitalId || null),
          }],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      toast.success(t('userAdded'));
      setIsDialogOpen(false);
      setFormData({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        hospitalId: '',
        role: '',
      });
      loadUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.message || t('errorOccurred'));
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Call edge function to delete user
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id },
      });

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم حذف المستخدم بنجاح' : 'User deleted successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || (language === 'ar' ? 'حدث خطأ أثناء حذف المستخدم' : 'Error deleting user'));
    }
  };

  const formatLastActivity = (lastActivity: string | null | undefined) => {
    if (!lastActivity) return language === 'ar' ? 'لم يسجل نشاط' : 'No activity';
    
    try {
      return formatDistanceToNow(new Date(lastActivity), {
        addSuffix: true,
        locale: language === 'ar' ? ar : undefined,
      });
    } catch {
      return language === 'ar' ? 'غير معروف' : 'Unknown';
    }
  };

  const getRoleLabel = (role: string) => {
    // Get from system roles
    const systemRole = lookupRoles.find((r) => r.code === role);
    if (systemRole) {
      return language === 'ar' ? systemRole.name_ar : systemRole.name;
    }
    
    // Handle global_admin explicitly
    if (role === 'global_admin') {
      return language === 'ar' ? 'مدير النظام' : 'Global Admin';
    }
    
    return role;
  };

  // Filter and search users
  const filteredUsers = users.filter(user => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      user.full_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.phone && user.phone.includes(searchQuery));

    // Role filter
    const matchesRole = selectedRoleFilter === 'all' || 
      user.roles.some(r => r.role === selectedRoleFilter);

    // Hospital filter (for global admins)
    const matchesHospital = selectedHospitalFilter === 'all' || 
      user.hospital_id === selectedHospitalFilter;

    return matchesSearch && matchesRole && matchesHospital;
  });

  // Get unique roles from all users for filter options
  const availableRoles = Array.from(new Set(
    users.flatMap(u => u.roles.map(r => r.role))
  ));

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {language === 'ar' ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة' : 'You do not have permission to access this page'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{t('users')}</h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'إدارة المستخدمين والأدوار' : 'Manage users and roles'}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('addUser')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('addUser')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">{t('fullName')}</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">{t('role')}</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Show global_admin only for global admins */}
                    {isGlobalAdmin && (
                      <SelectItem value="global_admin">
                        {language === 'ar' ? 'مدير النظام' : 'Global Admin'}
                      </SelectItem>
                    )}
                    
                    {/* Show custom roles from lookup table */}
                    {lookupRoles.map((role) => (
                      <SelectItem key={role.code} value={role.code}>
                        {language === 'ar' ? role.name_ar : role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.role !== 'global_admin' && (
                <div className="space-y-2">
                  <Label htmlFor="hospital">{t('hospital')}</Label>
                  <Select value={formData.hospitalId} onValueChange={(value) => setFormData({ ...formData, hospitalId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectHospital')} />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map((hospital) => (
                        <SelectItem key={hospital.id} value={hospital.id}>
                          {language === 'ar' ? hospital.name_ar : hospital.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit">{t('submit')}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'ar' ? 'بحث بالاسم، البريد الإلكتروني أو الهاتف...' : 'Search by name, email or phone...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div className="w-full md:w-64">
              <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder={language === 'ar' ? 'تصفية حسب الدور' : 'Filter by role'} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === 'ar' ? 'جميع الأدوار' : 'All Roles'}
                  </SelectItem>
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hospital Filter (for global admins only) */}
            {isGlobalAdmin && (
              <div className="w-full md:w-64">
                <Select value={selectedHospitalFilter} onValueChange={setSelectedHospitalFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder={language === 'ar' ? 'تصفية حسب المستشفى' : 'Filter by hospital'} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === 'ar' ? 'جميع المستشفيات' : 'All Hospitals'}
                    </SelectItem>
                    {hospitals.map((hospital) => (
                      <SelectItem key={hospital.id} value={hospital.id}>
                        {language === 'ar' ? hospital.name_ar : hospital.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-muted-foreground">
            {language === 'ar' 
              ? `عرض ${filteredUsers.length} من ${users.length} مستخدم`
              : `Showing ${filteredUsers.length} of ${users.length} users`
            }
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <Card 
            key={user.id} 
            className="hover:border-primary/50 transition-colors relative"
          >
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="bg-primary/5 p-3 rounded-lg border border-border">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">
                    {user.full_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground truncate" dir="ltr">{user.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedUser(user)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserToDelete(user);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.phone && (
                <p className="text-sm text-muted-foreground" dir="ltr">{user.phone}</p>
              )}
              {user.hospital_name && (
                <p className="text-sm text-muted-foreground">{user.hospital_name}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatLastActivity(user.last_activity_at)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <Badge key={role.id} variant="secondary">
                    {getRoleLabel(role.role)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'تأكيد حذف المستخدم' : 'Confirm User Deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? `هل أنت متأكد من حذف المستخدم "${userToDelete?.full_name}"؟ هذا الإجراء لا يمكن التراجع عنه.`
                : `Are you sure you want to delete user "${userToDelete?.full_name}"? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserDetailsSheet
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
        hospitals={hospitals}
        onUpdate={loadUsers}
      />

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || selectedRoleFilter !== 'all' || selectedHospitalFilter !== 'all'
                ? (language === 'ar' ? 'لا توجد نتائج للبحث' : 'No results found')
                : (language === 'ar' ? 'لا يوجد مستخدمين' : 'No users yet')
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
