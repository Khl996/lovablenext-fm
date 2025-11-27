import { useState, useEffect } from 'react';
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
  const { isGlobalAdmin, hospitalId } = useCurrentUser();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [lookupRoles, setLookupRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionMatrix, setPermissionMatrix] = useState<Record<string, Record<string, boolean>>>({});
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

      // Load system roles only (not team roles)
      const { data: rolesData, error: rolesError } = await supabase
        .from('system_roles')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (rolesError) throw rolesError;

      const systemRoles = rolesData || [];
      setLookupRoles(systemRoles);

      const [permsResult, rolePermsResult] = await Promise.all([
        supabase.from('permissions').select('*').order('category').order('name'),
        supabase.from('role_permissions').select('*'),
      ]);

      if (permsResult.error) throw permsResult.error;
      if (rolePermsResult.error) throw rolePermsResult.error;

      setPermissions(permsResult.data || []);
      setRolePermissions(rolePermsResult.data || []);

      // Build matrix using only role_code for consistency
      const matrix: Record<string, Record<string, boolean>> = {};
      systemRoles.forEach((role) => {
        matrix[role.code] = {};
        (permsResult.data || []).forEach((perm) => {
          const hasPermission = (rolePermsResult.data || []).some(
            (rp) => rp.role_code === role.code && rp.permission_key === perm.key && rp.allowed
          );
          matrix[role.code][perm.key] = hasPermission;
        });
      });
      setPermissionMatrix(matrix);
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

      // Check if code already exists
      const { data: existing } = await supabase
        .from('system_roles')
        .select('code')
        .eq('code', validatedData.code)
        .single();

      if (existing) {
        toast.error(language === 'ar' ? 'الكود موجود مسبقاً' : 'Code already exists');
        return;
      }

      // Insert new role
      const { error } = await supabase
        .from('system_roles')
        .insert([{
          code: validatedData.code,
          name: validatedData.name,
          name_ar: validatedData.name_ar,
          description: validatedData.description || null,
          display_order: lookupRoles.length + 1,
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

      // Delete all existing role permissions
      const { error: deleteError } = await supabase.from('role_permissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteError) throw deleteError;

      // Insert new permissions using role_code only
      const newPermissions: Array<{ role_code: string; permission_key: string; allowed: boolean }> = [];
      Object.entries(permissionMatrix).forEach(([roleCode, perms]) => {
        Object.entries(perms).forEach(([permKey, allowed]) => {
          if (allowed) {
            newPermissions.push({
              role_code: roleCode,
              permission_key: permKey,
              allowed: true,
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

      toast.success(language === 'ar' ? 'تم حفظ الصلاحيات بنجاح' : 'Permissions saved successfully');
      loadData();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast.error(error.message || t('errorOccurred'));
    } finally {
      setSaving(false);
    }
  };

  if (!isGlobalAdmin) {
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
              {language === 'ar' 
                ? '📌 هذه الصلاحيات الافتراضية لكل دور في النظام'
                : '📌 These are the default permissions for each role in the system'}
            </p>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'يمكنك تعديل صلاحيات المستخدمين بشكل استثنائي من صفحة تفاصيل المستخدم. صلاحيات أوامر العمل مثبتة ومثالية ولا تظهر هنا.'
                : 'You can customize individual user permissions from the user details page. Work Orders permissions are finalized and do not appear here.'}
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
                  <>
                    <tr key={category} className="bg-muted/50">
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
                        {lookupRoles.map((role) => (
                          <td key={`${role.code}-${perm.key}`} className="p-3 text-center">
                            <Checkbox
                              checked={permissionMatrix[role.code]?.[perm.key] || false}
                              onCheckedChange={() => togglePermission(role.code, perm.key)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
