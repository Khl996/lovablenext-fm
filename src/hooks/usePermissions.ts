import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type RolePermission = Database['public']['Tables']['role_permissions']['Row'];
type UserPermission = Database['public']['Tables']['user_permissions']['Row'];

export type PermissionKey = string;
export type PermissionEffect = 'grant' | 'deny';

export interface UserPermissionsInfo {
  loading: boolean;
  error?: string;
  allPermissions: PermissionKey[];
  hasPermission: (key: PermissionKey, hospitalId?: string | null) => boolean;
  hasAnyPermission: (keys: PermissionKey[], hospitalId?: string | null) => boolean;
  hasAllPermissions: (keys: PermissionKey[], hospitalId?: string | null) => boolean;
  refetch: () => Promise<void>;
}

type AppRole = Database['public']['Enums']['app_role'];

interface PermissionsCache {
  permissions: Set<PermissionKey>;
  userOverrides: Map<string, PermissionEffect>;
  hospitalOverrides: Map<string, Map<string, PermissionEffect>>;
}

/**
 * Enhanced permissions hook with better performance and caching
 * Supports both old app_role system and new role_code system
 */
export function usePermissions(
  userId: string | null,
  userRoles: AppRole[] = [],
  customRoleCodes: string[] = []
): UserPermissionsInfo {
  const [cache, setCache] = useState<PermissionsCache>({
    permissions: new Set(),
    userOverrides: new Map(),
    hospitalOverrides: new Map(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadPermissions = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(undefined);

      // Parallel fetch for better performance
      const [rolePermsResult, customRolePermsResult, userPermsResult] = await Promise.all([
        // Fetch old system permissions
        userRoles.length > 0
          ? supabase
              .from('role_permissions')
              .select('permission_key, allowed')
              .in('role', userRoles)
              .eq('allowed', true)
          : Promise.resolve({ data: null, error: null }),
        
        // Fetch custom role permissions
        customRoleCodes.length > 0
          ? supabase
              .from('role_permissions')
              .select('permission_key, allowed')
              .in('role_code', customRoleCodes)
              .eq('allowed', true)
          : Promise.resolve({ data: null, error: null }),
        
        // Fetch user-specific overrides
        supabase
          .from('user_permissions')
          .select('permission_key, effect, hospital_id')
          .eq('user_id', userId),
      ]);

      if (rolePermsResult.error) throw rolePermsResult.error;
      if (customRolePermsResult.error) throw customRolePermsResult.error;
      if (userPermsResult.error) throw userPermsResult.error;

      // Build cache
      const newCache: PermissionsCache = {
        permissions: new Set<PermissionKey>(),
        userOverrides: new Map<string, PermissionEffect>(),
        hospitalOverrides: new Map<string, Map<string, PermissionEffect>>(),
      };

      // Add role permissions to set
      rolePermsResult.data?.forEach((rp) => {
        if (rp.allowed) {
          newCache.permissions.add(rp.permission_key);
        }
      });

      customRolePermsResult.data?.forEach((rp) => {
        if (rp.allowed) {
          newCache.permissions.add(rp.permission_key);
        }
      });

      // Process user overrides
      userPermsResult.data?.forEach((up) => {
        if (!up.hospital_id) {
          // Global override
          newCache.userOverrides.set(up.permission_key, up.effect as PermissionEffect);
        } else {
          // Hospital-specific override
          if (!newCache.hospitalOverrides.has(up.hospital_id)) {
            newCache.hospitalOverrides.set(up.hospital_id, new Map());
          }
          newCache.hospitalOverrides
            .get(up.hospital_id)!
            .set(up.permission_key, up.effect as PermissionEffect);
        }
      });

      // Apply global overrides to permissions set
      newCache.userOverrides.forEach((effect, key) => {
        if (effect === 'grant') {
          newCache.permissions.add(key);
        } else if (effect === 'deny') {
          newCache.permissions.delete(key);
        }
      });

      setCache(newCache);
    } catch (err: any) {
      console.error('Error loading permissions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, JSON.stringify(userRoles), JSON.stringify(customRoleCodes)]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Memoized permission checking functions
  const hasPermission = useCallback(
    (key: PermissionKey, hospitalId?: string | null): boolean => {
      // Check hospital-specific deny first (highest priority)
      if (hospitalId) {
        const hospitalOverrides = cache.hospitalOverrides.get(hospitalId);
        if (hospitalOverrides?.get(key) === 'deny') return false;
        if (hospitalOverrides?.get(key) === 'grant') return true;
      }

      // Check global deny
      if (cache.userOverrides.get(key) === 'deny') return false;

      // Check global grant
      if (cache.userOverrides.get(key) === 'grant') return true;

      // Check hospital-specific grant
      if (hospitalId) {
        const hospitalOverrides = cache.hospitalOverrides.get(hospitalId);
        if (hospitalOverrides?.get(key) === 'grant') return true;
      }

      // Check base permissions
      return cache.permissions.has(key);
    },
    [cache]
  );

  const hasAnyPermission = useCallback(
    (keys: PermissionKey[], hospitalId?: string | null): boolean => {
      return keys.some((key) => hasPermission(key, hospitalId));
    },
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (keys: PermissionKey[], hospitalId?: string | null): boolean => {
      return keys.every((key) => hasPermission(key, hospitalId));
    },
    [hasPermission]
  );

  const allPermissions = useMemo(() => Array.from(cache.permissions), [cache.permissions]);

  return {
    loading,
    error,
    allPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refetch: loadPermissions,
  };
}
