import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Shield, Save } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Permission = Database['public']['Tables']['permissions']['Row'];
type RolePermission = Database['public']['Tables']['role_permissions']['Row'];

const roles = [
  { value: 'global_admin', labelEn: 'Global Admin', labelAr: 'مدير النظام' },
  { value: 'hospital_admin', labelEn: 'Hospital Admin', labelAr: 'مدير المستشفى' },
  { value: 'facility_manager', labelEn: 'Facility Manager', labelAr: 'مدير المرافق' },
  { value: 'maintenance_manager', labelEn: 'Maintenance Manager', labelAr: 'مدير الصيانة' },
  { value: 'supervisor', labelEn: 'Supervisor', labelAr: 'مشرف' },
  { value: 'technician', labelEn: 'Technician', labelAr: 'فني' },
  { value: 'reporter', labelEn: 'Reporter', labelAr: 'مبلغ' },
];

export default function RolePermissions() {
  const { language, t } = useLanguage();
  const { isGlobalAdmin } = useCurrentUser();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionMatrix, setPermissionMatrix] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [permsResult, rolePermsResult] = await Promise.all([
        supabase.from('permissions').select('*').order('category').order('name'),
        supabase.from('role_permissions').select('*'),
      ]);

      if (permsResult.error) throw permsResult.error;
      if (rolePermsResult.error) throw rolePermsResult.error;

      setPermissions(permsResult.data || []);
      setRolePermissions(rolePermsResult.data || []);

      // Build matrix
      const matrix: Record<string, Record<string, boolean>> = {};
      roles.forEach((role) => {
        matrix[role.value] = {};
        (permsResult.data || []).forEach((perm) => {
          const hasPermission = (rolePermsResult.data || []).some(
            (rp) => rp.role === role.value && rp.permission_key === perm.key && rp.allowed
          );
          matrix[role.value][perm.key] = hasPermission;
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

  const handleSave = async () => {
    try {
      setSaving(true);

      // Delete all existing role permissions
      const { error: deleteError } = await supabase.from('role_permissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (deleteError) throw deleteError;

      // Insert new permissions
      const newPermissions: Array<{ role: string; permission_key: string; allowed: boolean }> = [];
      Object.entries(permissionMatrix).forEach(([role, perms]) => {
        Object.entries(perms).forEach(([permKey, allowed]) => {
          if (allowed) {
            newPermissions.push({
              role,
              permission_key: permKey,
              allowed: true,
            });
          }
        });
      });

      if (newPermissions.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(newPermissions as any);
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

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t('save')}
        </Button>
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
                  {roles.map((role) => (
                    <th key={role.value} className="text-center p-3 font-semibold min-w-[120px]">
                      {language === 'ar' ? role.labelAr : role.labelEn}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <>
                    <tr key={category} className="bg-muted/50">
                      <td colSpan={roles.length + 1} className="p-3 font-semibold">
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
                        {roles.map((role) => (
                          <td key={`${role.value}-${perm.key}`} className="p-3 text-center">
                            <Checkbox
                              checked={permissionMatrix[role.value]?.[perm.key] || false}
                              onCheckedChange={() => togglePermission(role.value, perm.key)}
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
