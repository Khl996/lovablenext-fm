import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Permission = Database['public']['Tables']['permissions']['Row'];
type RolePermission = Database['public']['Tables']['role_permissions']['Row'];
type UserPermission = Database['public']['Tables']['user_permissions']['Row'];

export type PermissionKey = string;

export type UserPermissionsInfo = {
  loading: boolean;
  error?: string;
  allPermissions: PermissionKey[];
  hasPermission: (key: PermissionKey, hospitalId?: string | null) => boolean;
  refetch: () => Promise<void>;
};

type AppRole = Database['public']['Enums']['app_role'];

export function usePermissions(userId: string | null, userRoles: AppRole[] = [], customRoleCodes: string[] = []): UserPermissionsInfo {
  const [allPermissions, setAllPermissions] = useState<PermissionKey[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadPermissions = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(undefined);

      // Fetch role-based permissions (old system - app_role)
      const { data: rolePermsData, error: rolePermsError } = await supabase
        .from('role_permissions')
        .select('*')
        .in('role', userRoles)
        .eq('allowed', true);

      if (rolePermsError) throw rolePermsError;

      // Fetch custom role permissions (new system - role_code)
      let customRolePermsData: any[] = [];
      if (customRoleCodes.length > 0) {
        const { data, error } = await supabase
          .from('role_permissions')
          .select('*')
          .in('role_code', customRoleCodes)
          .eq('allowed', true);

        if (error) throw error;
        customRolePermsData = data || [];
      }

      // Fetch user-specific permissions
      const { data: userPermsData, error: userPermsError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (userPermsError) throw userPermsError;

      setRolePermissions([...(rolePermsData || []), ...customRolePermsData]);
      setUserPermissions(userPermsData || []);

      // Compute final permissions list
      const basePermissions = new Set([
        ...(rolePermsData?.map((rp) => rp.permission_key) || []),
        ...(customRolePermsData?.map((rp) => rp.permission_key) || [])
      ]);
      
      // Apply user-specific overrides
      userPermsData?.forEach((up) => {
        if (up.effect === 'grant') {
          basePermissions.add(up.permission_key);
        } else if (up.effect === 'deny') {
          basePermissions.delete(up.permission_key);
        }
      });

      setAllPermissions(Array.from(basePermissions));
    } catch (err: any) {
      console.error('Error loading permissions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [userId, JSON.stringify(userRoles), JSON.stringify(customRoleCodes)]);

  const hasPermission = (key: PermissionKey, hospitalId?: string | null): boolean => {
    // Check for explicit deny (highest priority)
    const denyOverride = userPermissions.find(
      (up) =>
        up.permission_key === key &&
        up.effect === 'deny' &&
        (up.hospital_id === hospitalId || (!up.hospital_id && !hospitalId))
    );
    if (denyOverride) return false;

    // Check for explicit grant
    const grantOverride = userPermissions.find(
      (up) =>
        up.permission_key === key &&
        up.effect === 'grant' &&
        (up.hospital_id === hospitalId || (!up.hospital_id && !hospitalId))
    );
    if (grantOverride) return true;

    // Check base role permissions
    return allPermissions.includes(key);
  };

  return {
    loading,
    error,
    allPermissions,
    hasPermission,
    refetch: loadPermissions,
  };
}
