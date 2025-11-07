import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
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
  email: string;
  phone: string | null;
  hospital_id: string | null;
  hospital_name?: string;
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

const rolesList = [
  { value: 'global_admin', labelEn: 'Global Admin', labelAr: 'مدير النظام' },
  { value: 'hospital_admin', labelEn: 'Hospital Admin', labelAr: 'مدير المستشفى' },
  { value: 'facility_manager', labelEn: 'Facility Manager', labelAr: 'مدير المرافق' },
  { value: 'maintenance_manager', labelEn: 'Maintenance Manager', labelAr: 'مدير الصيانة' },
  { value: 'supervisor', labelEn: 'Supervisor', labelAr: 'مشرف' },
  { value: 'technician', labelEn: 'Technician', labelAr: 'فني' },
  { value: 'reporter', labelEn: 'Reporter', labelAr: 'مبلغ' },
];

interface UserDetailsSheetProps {
  user: UserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitals: Hospital[];
  onUpdate: () => void;
}

export function UserDetailsSheet({ user, open, onOpenChange, hospitals, onUpdate }: UserDetailsSheetProps) {
  const { language, t } = useLanguage();
  const { isGlobalAdmin, hospitalId } = useCurrentUser();
  const [newRole, setNewRole] = useState('');
  const [newRoleHospital, setNewRoleHospital] = useState('');
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const getRoleLabel = (role: string) => {
    const roleObj = rolesList.find((r) => r.value === role);
    return language === 'ar' ? roleObj?.labelAr : roleObj?.labelEn;
  };

  const canAssignRole = (role: string) => {
    if (isGlobalAdmin) return true;
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
      const roleHospitalId = newRole === 'global_admin' ? null : (newRoleHospital || hospitalId);

      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: user.id,
          role: newRole as any,
          hospital_id: roleHospitalId,
        }]);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إضافة الدور بنجاح' : 'Role added successfully');
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

  const handleDeleteRole = async (roleId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم حذف الدور بنجاح' : 'Role removed successfully');
      setRoleToDelete(null);
      onUpdate();
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast.error(error.message || t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const availableRoles = rolesList.filter(role => 
    !user.roles.some(ur => ur.role === role.value) && canAssignRole(role.value)
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{language === 'ar' ? 'تفاصيل المستخدم' : 'User Details'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* User Info */}
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">{t('fullName')}</Label>
                <p className="font-medium">{user.full_name}</p>
              </div>

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
            </div>

            {/* Roles Section */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base">{language === 'ar' ? 'الأدوار' : 'Roles'}</Label>
              
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
                        onClick={() => setRoleToDelete(role.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Role Form */}
              {availableRoles.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <Label>{language === 'ar' ? 'إضافة دور جديد' : 'Add New Role'}</Label>
                  
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectRole')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {language === 'ar' ? role.labelAr : role.labelEn}
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
                    disabled={loading || !newRole || (newRole !== 'global_admin' && !newRoleHospital && !hospitalId)}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {language === 'ar' ? 'إضافة الدور' : 'Add Role'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد من حذف هذا الدور؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to remove this role? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleToDelete && handleDeleteRole(roleToDelete)}
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
