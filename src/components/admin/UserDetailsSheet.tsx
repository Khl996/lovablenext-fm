import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, X, Plus, Shield, Trash2 } from 'lucide-react';
import { UserPermissionsSection } from './UserPermissionsSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserData {
  id: string;
  full_name: string;
  full_name_ar: string | null;
  email: string;
  phone: string | null;
  hospital_id: string | null;
  hospital_name?: string;
  roles: Array<{
    id: string;
    role: string;
    hospital_id: string | null;
    hospital_name?: string;
    isSystemRole?: boolean;
  }>;
}

interface Hospital {
  id: string;
  name: string;
  name_ar: string;
}

interface SystemRole {
  code: string;
  name: string;
  name_ar: string;
}

interface UserDetailsSheetProps {
  user: UserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitals: Hospital[];
  onUpdate: () => void;
}

export function UserDetailsSheet({ user, open, onOpenChange, hospitals, onUpdate }: UserDetailsSheetProps) {
  const { language, t } = useLanguage();
  const { isGlobalAdmin } = useCurrentUser();
  const currentUser = useCurrentUser();
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);
  const [newRole, setNewRole] = useState('');
  const [newRoleHospital, setNewRoleHospital] = useState('');
  const [roleToDelete, setRoleToDelete] = useState<{id: string; isSystemRole: boolean} | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    full_name_ar: '',
    phone: '',
    hospital_id: '',
  });
  const [buildings, setBuildings] = useState<any[]>([]);
  const [assignedBuildings, setAssignedBuildings] = useState<string[]>([]);

  useEffect(() => {
    loadSystemRoles();
    if (currentUser.hospitalId) {
      loadBuildings();
    }
  }, [currentUser.hospitalId]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        full_name_ar: user.full_name_ar || '',
        phone: user.phone || '',
        hospital_id: user.hospital_id || '',
      });
      loadAssignedBuildings();
    }
  }, [user]);

  const loadSystemRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('system_roles')
        .select('code, name, name_ar')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      setSystemRoles(data || []);
    } catch (error) {
      console.error('Error loading system roles:', error);
    }
  };

  const loadBuildings = async () => {
    if (!currentUser.hospitalId) return;
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, name_ar')
        .eq('hospital_id', currentUser.hospitalId);
      
      if (error) throw error;
      setBuildings(data || []);
    } catch (error) {
      console.error('Error loading buildings:', error);
    }
  };

  const loadAssignedBuildings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('supervisor_buildings')
        .select('building_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setAssignedBuildings(data?.map(b => b.building_id) || []);
    } catch (error) {
      console.error('Error loading assigned buildings:', error);
    }
  };

  if (!user) return null;

  const getRoleLabel = (role: string) => {
    const roleObj = systemRoles.find((r) => r.code === role);
    return language === 'ar' ? roleObj?.name_ar : roleObj?.name;
  };

  const canAssignRole = (role: string) => {
    if (currentUser.isGlobalAdmin) return true;
    if (role === 'global_admin' || role === 'hospital_admin') return false;
    return true;
  };

  const handleAddRole = async () => {
    if (!newRole) {
      toast.error(t('fillRequired'));
      return;
    }

    if (!canAssignRole(newRole)) {
      toast.error(language === 'ar' ? 'ليس لديك صلاحية لتعيين هذا الدور' : 'You cannot assign this role');
      return;
    }

    setLoading(true);
    try {
      const roleHospitalId = newRole === 'global_admin' ? null : (newRoleHospital || currentUser.hospitalId);

      // Add to user_custom_roles (new system)
      const { error } = await supabase
        .from('user_custom_roles')
        .insert([{
          user_id: user.id,
          role_code: newRole,
          hospital_id: roleHospitalId,
        }]);

      if (error) throw error;

      toast.success(t('roleAdded'));
      setNewRole('');
      setNewRoleHospital('');
      onUpdate();
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast.error(error.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user?.id || !profileForm.full_name || !profileForm.full_name_ar) {
      toast.error(t('fillRequired'));
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          full_name_ar: profileForm.full_name_ar,
          phone: profileForm.phone || null,
          hospital_id: profileForm.hospital_id || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update supervisor buildings if user is supervisor or facility manager
      const isSupervisorRole = user.roles?.some(r => 
        r.role === 'supervisor' || r.role === 'facility_manager'
      );

      if (isSupervisorRole && currentUser.hospitalId) {
        // Delete existing assignments
        await supabase
          .from('supervisor_buildings')
          .delete()
          .eq('user_id', user.id);

        // Insert new assignments
        if (assignedBuildings.length > 0) {
          const assignments = assignedBuildings.map(buildingId => ({
            user_id: user.id,
            building_id: buildingId,
            hospital_id: currentUser.hospitalId,
          }));

          const { error: assignError } = await supabase
            .from('supervisor_buildings')
            .insert(assignments);

          if (assignError) throw assignError;
        }
      }

      toast.success(t('profileUpdated'));
      setIsEditingProfile(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string, isSystemRole: boolean) => {
    setLoading(true);
    try {
      const tableName = isSystemRole ? 'user_roles' : 'user_custom_roles';
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast.success(t('roleDeleted'));
      setRoleToDelete(null);
      onUpdate();
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast.error(error.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const availableRoles = systemRoles.filter(role => 
    !user.roles.some(ur => ur.role === role.code) && canAssignRole(role.code)
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('userDetails')}</SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="profile" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</TabsTrigger>
              <TabsTrigger value="permissions">
                <Shield className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'الصلاحيات' : 'Permissions'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">{/* User Info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg">{language === 'ar' ? 'معلومات المستخدم' : 'User Information'}</CardTitle>
                {(currentUser.isGlobalAdmin || currentUser.isHospitalAdmin) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                  >
                    {isEditingProfile ? t('cancel') : t('editProfile')}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {isEditingProfile ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="full_name">{t('fullName')}</Label>
                      <Input
                        id="full_name"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="full_name_ar">{t('fullNameAr')}</Label>
                      <Input
                        id="full_name_ar"
                        value={profileForm.full_name_ar}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name_ar: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('phone')}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      />
                    </div>
                    {currentUser.isGlobalAdmin && (
                      <div className="space-y-2">
                        <Label htmlFor="hospital_id">{t('hospital')}</Label>
                        <Select
                          value={profileForm.hospital_id || 'none'}
                          onValueChange={(value) => setProfileForm({ ...profileForm, hospital_id: value === 'none' ? '' : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectHospital')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{language === 'ar' ? 'بدون مستشفى' : 'No Hospital'}</SelectItem>
                            {hospitals.map((hospital) => (
                              <SelectItem key={hospital.id} value={hospital.id}>
                                {language === 'ar' ? hospital.name_ar : hospital.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleUpdateProfile} disabled={loading}>
                        {t('save')}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                        {t('cancel')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-muted-foreground">{t('fullName')}</Label>
                      <p className="font-medium">{user.full_name}</p>
                    </div>
                    {user.full_name_ar && (
                      <div>
                        <Label className="text-muted-foreground">{t('fullNameAr')}</Label>
                        <p className="font-medium">{user.full_name_ar}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">{t('email')}</Label>
                      <p className="font-medium" dir="ltr">{user.email}</p>
                    </div>
                    {user.phone && (
                      <div>
                        <Label className="text-muted-foreground">{t('phone')}</Label>
                        <p className="font-medium" dir="ltr">{user.phone}</p>
                      </div>
                    )}
                    {user.hospital_name && (
                      <div>
                        <Label className="text-muted-foreground">{t('hospital')}</Label>
                        <p className="font-medium">{user.hospital_name}</p>
                      </div>
                     )}
                   </>
                 )}
               </CardContent>
             </Card>

             {/* Building Assignments Section - Only for Supervisors and Facility Managers */}
             {(user.roles?.some(r => 
               r.role === 'supervisor' || r.role === 'facility_manager'
             )) && (
               <Card>
                 <CardHeader>
                   <CardTitle className="text-lg">
                     {language === 'ar' ? 'المباني المُكلف بها' : 'Assigned Buildings'}
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-3">
                     {buildings.length === 0 ? (
                       <p className="text-sm text-muted-foreground">
                         {language === 'ar' ? 'لا توجد مباني متاحة' : 'No buildings available'}
                       </p>
                     ) : (
                       buildings.map((building) => (
                         <div key={building.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                           <input
                             type="checkbox"
                             id={`building-${building.id}`}
                             checked={assignedBuildings.includes(building.id)}
                             onChange={(e) => {
                               if (isEditingProfile) {
                                 if (e.target.checked) {
                                   setAssignedBuildings([...assignedBuildings, building.id]);
                                 } else {
                                   setAssignedBuildings(assignedBuildings.filter(id => id !== building.id));
                                 }
                               }
                             }}
                             disabled={!isEditingProfile}
                             className="h-4 w-4 rounded border-gray-300 disabled:opacity-50"
                           />
                           <label 
                             htmlFor={`building-${building.id}`} 
                             className={`text-sm ${!isEditingProfile ? 'opacity-70' : 'cursor-pointer'}`}
                           >
                             {language === 'ar' ? building.name_ar : building.name}
                           </label>
                         </div>
                       ))
                     )}
                     {isEditingProfile && buildings.length > 0 && (
                       <p className="text-xs text-muted-foreground mt-2">
                         {language === 'ar' 
                           ? 'اختر المباني التي يمكن للمشرف إدارة أوامر العمل فيها'
                           : 'Select buildings where the supervisor can manage work orders'}
                       </p>
                     )}
                   </div>
                 </CardContent>
               </Card>
             )}

             {/* Roles Section */}
             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg">{t('roles')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Roles */}
                <div className="space-y-2">
                  {user.roles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <Badge variant="secondary" className="mb-1">
                          {getRoleLabel(role.role)}
                        </Badge>
                        {role.hospital_name && (
                          <p className="text-xs text-muted-foreground mt-1">{role.hospital_name}</p>
                        )}
                      </div>
                      {canAssignRole(role.role) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRoleToDelete({id: role.id, isSystemRole: role.isSystemRole || false})}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Role Form */}
                {(currentUser.isGlobalAdmin || currentUser.isHospitalAdmin) && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">{t('addRole')}</h4>
                    
                    {availableRoles.length > 0 ? (
                      <div className="space-y-3">
                        <Select value={newRole} onValueChange={setNewRole}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectRole')} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map((role) => (
                              <SelectItem key={role.code} value={role.code}>
                                {language === 'ar' ? role.name_ar : role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {newRole && newRole !== 'global_admin' && (
                          <Select value={newRoleHospital} onValueChange={setNewRoleHospital}>
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
                        )}

                        <Button
                          onClick={handleAddRole}
                          disabled={loading || !newRole || (newRole !== 'global_admin' && !newRoleHospital && !currentUser.hospitalId)}
                          className="w-full gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          {language === 'ar' ? 'إضافة الدور' : 'Add Role'}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'لا توجد أدوار متاحة للإضافة' : 'No roles available to add'}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            </TabsContent>

            <TabsContent value="permissions">
              {user && (
                <UserPermissionsSection
                  userId={user.id}
                  hospitals={hospitals}
                  userHospitalId={user.hospital_id}
                  isGlobalAdmin={isGlobalAdmin}
                />
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteRole')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleToDelete && handleDeleteRole(roleToDelete.id, roleToDelete.isSystemRole)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
