import { useState, useEffect, Fragment } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Shield, Save, Plus } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { z } from 'zod';

type Permission = Database['public']['Tables']['permissions']['Row'];
type RolePermission = Database['public']['Tables']['role_permissions']['Row'];

export default function RolePermissions() {
  const { language, t } = useLanguage();
  const { permissions: userPermissions, hospitalId } = useCurrentUser();
  const canManageRolePermissions = userPermissions.hasPermission('settings.role_permissions');
  const isGlobalAdmin = userPermissions.hasPermission('tenants.manage_roles') && !hospitalId;
  const isHospitalAdmin = userPermissions.hasPermission('settings.role_permissions') && hospitalId;
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [lookupRoles, setLookupRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionMatrix, setPermissionMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [hospitalOverrides, setHospitalOverrides] = useState<Set<string>>(new Set());
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({
    code: '',
    name: '',
    name_ar: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get distinct roles from role_permissions
      const { data: rolePermsData, error: rolePermsError } = await supabase
        .from('role_permissions')
        .select('role')
        .not('role', 'is', null);

      if (rolePermsError) throw rolePermsError;

      // Extract unique roles
      const uniqueRoles = Array.from(new Set((rolePermsData || []).map(rp => rp.role)));
      const systemRoles = uniqueRoles.map(role => ({
        code: role,
        name: role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        name_ar: role,
        is_active: true,
        display_order: 0,
      }));
      setLookupRoles(systemRoles);

      const [permsResult, rolePermsResult] = await Promise.all([
        supabase.from('permissions').select('*').order('category').order('name'),
        supabase.from('role_permissions').select('*'),
      ]);

      if (permsResult.error) throw permsResult.error;
      if (rolePermsResult.error) throw rolePermsResult.error;

      setPermissions(permsResult.data || []);
      setRolePermissions(rolePermsResult.data || []);

      // Build matrix with hospital override tracking
      const matrix: Record<string, Record<string, boolean>> = {};
      const overrides = new Set<string>();
      
      systemRoles.forEach((role) => {
        matrix[role.code] = {};
        (permsResult.data || []).forEach((perm) => {
          // Check for hospital-specific permission first
          const hospitalPerm = (rolePermsResult.data || []).find(
            (rp) => rp.role_code === role.code && 
                   rp.permission_key === perm.key && 
                   rp.hospital_id === hospitalId
          );
          
          // If hospital-specific exists, use it and mark as override
          if (hospitalPerm) {
            matrix[role.code][perm.key] = hospitalPerm.allowed;
            overrides.add(`${role.code}:${perm.key}`);
          } else {
            // Otherwise use global default (hospital_id IS NULL)
            const globalPerm = (rolePermsResult.data || []).find(
              (rp) => rp.role_code === role.code && 
                     rp.permission_key === perm.key && 
                     rp.hospital_id === null
            );
            matrix[role.code][perm.key] = globalPerm?.allowed || false;
          }
        });
      });
      
      setPermissionMatrix(matrix);
      setHospitalOverrides(overrides);
    } catch (error: any) {
      console.error('Error loading permissions:', error);
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (role: string, permissionKey: string) => {
    setPermissionMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permissionKey]: !prev[role][permissionKey],
      },
    }));
    
    // Mark as hospital override when hospital admin modifies
    if (isHospitalAdmin && !isGlobalAdmin) {
      setHospitalOverrides((prev) => new Set(prev).add(`${role}:${permissionKey}`));
    }
  };

  const resetToDefault = async (role: string, permissionKey: string) => {
    if (!hospitalId) return;
    
    try {
      // Delete hospital-specific override
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_code', role)
        .eq('permission_key', permissionKey)
        .eq('hospital_id', hospitalId);
      
      if (error) throw error;
      
      toast.success(language === 'ar' ? 'تم الإرجاع للإعداد الافتراضي' : 'Reset to default');
      loadData();
    } catch (error: any) {
      console.error('Error resetting permission:', error);
      toast.error(error.message || t('errorOccurred'));
    }
  };

  const roleSchema = z.object({
    code: z.string()
      .trim()
      .min(2, { message: language === 'ar' ? 'الكود يجب أن يكون حرفين على الأقل' : 'Code must be at least 2 characters' })
      .max(50, { message: language === 'ar' ? 'الكود يجب أن يكون أقل من 50 حرف' : 'Code must be less than 50 characters' })
      .regex(/^[a-z_]+$/, { message: language === 'ar' ? 'الكود يجب أن يحتوي على أحرف صغيرة و _ فقط' : 'Code must contain only lowercase letters and underscores' }),
    name: z.string()
      .trim()
      .min(2, { message: language === 'ar' ? 'الاسم يجب أن يكون حرفين على الأقل' : 'Name must be at least 2 characters' })
      .max(100, { message: language === 'ar' ? 'الاسم يجب أن يكون أقل من 100 حرف' : 'Name must be less than 100 characters' }),
    name_ar: z.string()
      .trim()
      .min(2, { message: language === 'ar' ? 'الاسم بالعربي يجب أن يكون حرفين على الأقل' : 'Arabic name must be at least 2 characters' })
      .max(100, { message: language === 'ar' ? 'الاسم بالعربي يجب أن يكون أقل من 100 حرف' : 'Arabic name must be less than 100 characters' }),
    description: z.string()
      .trim()
      .max(500, { message: language === 'ar' ? 'الوصف يجب أن يكون أقل من 500 حرف' : 'Description must be less than 500 characters' })
      .optional(),
  });

  const handleAddRole = async () => {
    try {
      // Validate inputs
      const validatedData = roleSchema.parse(newRole);

      // Check if role already exists
      const { data: existing } = await supabase
        .from('role_permissions')
        .select('role')
        .eq('role', validatedData.code)
        .limit(1)
        .maybeSingle();

      if (existing) {
        toast.error(language === 'ar' ? 'الدور موجود مسبقاً' : 'Role already exists');
        return;
      }

      // Create a default permission for this role so it appears in the list
      const { error } = await supabase
        .from('role_permissions')
        .insert([{
          role: validatedData.code,
          permission_key: 'work_orders.view',
          allowed: false,
        }]);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إضافة الدور بنجاح' : 'Role added successfully');
      setIsAddRoleDialogOpen(false);
      setNewRole({ code: '', name: '', name_ar: '', description: '' });
      loadData();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Error adding role:', error);
        toast.error(error.message || t('errorOccurred'));
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (isGlobalAdmin) {
        // Global admin: manage global defaults (hospital_id = NULL)
        // Delete all global defaults
        const { error: deleteError } = await supabase
          .from('role_permissions')
          .delete()
          .is('hospital_id', null);
        if (deleteError) throw deleteError;

        // Insert new global defaults
        const newPermissions: Array<{ role_code: string; permission_key: string; allowed: boolean; hospital_id: null }> = [];
        Object.entries(permissionMatrix).forEach(([roleCode, perms]) => {
          Object.entries(perms).forEach(([permKey, allowed]) => {
            if (allowed) {
              newPermissions.push({
                role_code: roleCode,
                permission_key: permKey,
                allowed: true,
                hospital_id: null,
              });
            }
          });
        });

        if (newPermissions.length > 0) {
          const { error: insertError } = await supabase
            .from('role_permissions')
            .insert(newPermissions);
          if (insertError) throw insertError;
        }
      } else if (isHospitalAdmin && hospitalId) {
        // Hospital admin: only save hospital-specific overrides
        // Delete existing hospital overrides
        const { error: deleteError } = await supabase
          .from('role_permissions')
          .delete()
          .eq('hospital_id', hospitalId);
        if (deleteError) throw deleteError;

        // Insert only modified permissions as hospital overrides
        const hospitalPermissions: Array<{ 
          role_code: string; 
          permission_key: string; 
          allowed: boolean; 
          hospital_id: string 
        }> = [];
        
        hospitalOverrides.forEach((overrideKey) => {
          const [roleCode, permKey] = overrideKey.split(':');
          const allowed = permissionMatrix[roleCode]?.[permKey] || false;
          
          hospitalPermissions.push({
            role_code: roleCode,
            permission_key: permKey,
            allowed,
            hospital_id: hospitalId,
          });
        });

        if (hospitalPermissions.length > 0) {
          const { error: insertError } = await supabase
            .from('role_permissions')
            .insert(hospitalPermissions);
          if (insertError) throw insertError;
        }
      }

      toast.success(language === 'ar' ? 'تم حفظ الصلاحيات بنجاح' : 'Permissions saved successfully');
      loadData();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast.error(error.message || t('errorOccurred'));
    } finally {
      setSaving(false);
    }
  };

  if (!canManageRolePermissions) {
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

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      {/* Explanation Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="text-sm space-y-2">
            <p className="font-medium">
              {isGlobalAdmin
                ? (language === 'ar' 
                    ? '📌 هذه الصلاحيات الافتراضية العامة لكل دور في جميع المستشفيات'
                    : '📌 These are the global default permissions for all hospitals')
                : (language === 'ar'
                    ? '📌 يمكنك تخصيص صلاحيات مستشفاك - التعديلات تطبق فقط على مستشفاك'
                    : '📌 Customize your hospital permissions - changes apply only to your hospital')}
            </p>
            <p className="text-muted-foreground">
              {isGlobalAdmin
                ? (language === 'ar' 
                    ? 'التعديلات هنا تؤثر على جميع المستشفيات ما لم يكن للمستشفى تخصيص خاص.'
                    : 'Changes here affect all hospitals unless a hospital has specific overrides.')
                : (language === 'ar'
                    ? 'الصلاحيات العادية من الإعدادات العامة، والصلاحيات المميزة 🔸 هي تخصيصات مستشفاك.'
                    : 'Regular permissions are from global defaults, 🔸 marked ones are your hospital customizations.')}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            {language === 'ar' ? 'صلاحيات الأدوار' : 'Role Permissions'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' ? 'إدارة الصلاحيات الأساسية لكل دور' : 'Manage base permissions for each role'}
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isAddRoleDialogOpen} onOpenChange={setIsAddRoleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                {language === 'ar' ? 'إضافة دور' : 'Add Role'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{language === 'ar' ? 'إضافة دور جديد' : 'Add New Role'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="code">{language === 'ar' ? 'الكود' : 'Code'}</Label>
                  <Input
                    id="code"
                    value={newRole.code}
                    onChange={(e) => setNewRole({ ...newRole, code: e.target.value })}
                    placeholder="e.g. department_head"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'أحرف صغيرة و _ فقط' : 'Lowercase letters and underscores only'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">{language === 'ar' ? 'الاسم (English)' : 'Name (English)'}</Label>
                  <Input
                    id="name"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    placeholder="Department Head"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_ar">{language === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                  <Input
                    id="name_ar"
                    value={newRole.name_ar}
                    onChange={(e) => setNewRole({ ...newRole, name_ar: e.target.value })}
                    placeholder="رئيس القسم"
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{language === 'ar' ? 'الوصف (اختياري)' : 'Description (Optional)'}</Label>
                  <Textarea
                    id="description"
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    placeholder={language === 'ar' ? 'وصف الدور...' : 'Role description...'}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddRoleDialogOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button onClick={handleAddRole}>
                    {language === 'ar' ? 'إضافة' : 'Add'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t('save')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'مصفوفة الصلاحيات' : 'Permissions Matrix'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-start p-3 font-semibold min-w-[200px]">
                    {language === 'ar' ? 'الصلاحية' : 'Permission'}
                  </th>
                  {lookupRoles.map((role) => (
                    <th key={role.code} className="text-center p-3 font-semibold min-w-[120px]">
                      {language === 'ar' ? role.name_ar : role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <Fragment key={category}>
                    <tr className="bg-muted/50">
                      <td colSpan={lookupRoles.length + 1} className="p-3 font-semibold">
                        {category.toUpperCase()}
                      </td>
                    </tr>
                    {perms.map((perm) => (
                      <tr key={perm.key} className="border-b hover:bg-muted/20">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{language === 'ar' ? perm.name_ar : perm.name}</div>
                            {perm.description && (
                              <div className="text-xs text-muted-foreground mt-1">{perm.description}</div>
                            )}
                          </div>
                        </td>
                        {lookupRoles.map((role) => {
                          const isOverride = hospitalOverrides.has(`${role.code}:${perm.key}`);
                          const isChecked = permissionMatrix[role.code]?.[perm.key] || false;

                          return (
                            <td key={`${role.code}-${perm.key}`} className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => togglePermission(role.code, perm.key)}
                                />
                                {isOverride && (
                                  <span
                                    className="text-xs cursor-help"
                                    title={language === 'ar' ? 'تخصيص للمستشفى' : 'Hospital override'}
                                  >
                                    🔸
                                  </span>
                                )}
                                {isOverride && !isGlobalAdmin && (
                                  <button
                                    onClick={() => resetToDefault(role.code, perm.key)}
                                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                                    title={language === 'ar' ? 'إرجاع للإعداد الافتراضي' : 'Reset to default'}
                                  >
                                    ↺
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
