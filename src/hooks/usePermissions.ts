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

      // استخدم دالة backend الموحدة للحصول على كل الصلاحيات الفعّالة
      const [effectivePermsResult, hospitalOverridesResult] = await Promise.all([
        supabase.rpc('get_effective_permissions', { _user_id: userId }),
        supabase
          .from('user_permissions')
          .select('permission_key, effect, hospital_id')
          .eq('user_id', userId)
          .not('hospital_id', 'is', null), // فقط overrides المرتبطة بمستشفى
      ]);

      if (effectivePermsResult.error) throw effectivePermsResult.error;
      if (hospitalOverridesResult.error) throw hospitalOverridesResult.error;

      // بناء الكاش الجديد
      const newCache: PermissionsCache = {
        permissions: new Set<PermissionKey>(),
        userOverrides: new Map<string, PermissionEffect>(),
        hospitalOverrides: new Map<string, Map<string, PermissionEffect>>(),
      };

      // أضف كل الصلاحيات الفعّالة القادمة من الدالة المخزّنة
      (effectivePermsResult.data || []).forEach((row: any) => {
        const key = row.permission_key || row.perm || row.permission; // احتياط لأسماء أعمدة مختلفة
        if (key) {
          newCache.permissions.add(key as PermissionKey);
        }
      });

      // عالج hospital-specific overrides فقط (global overrides مطبّقة بالفعل في الدالة المخزّنة)
      hospitalOverridesResult.data?.forEach((up) => {
        if (!up.hospital_id) return;
        if (!newCache.hospitalOverrides.has(up.hospital_id)) {
          newCache.hospitalOverrides.set(up.hospital_id, new Map());
        }
        newCache.hospitalOverrides
          .get(up.hospital_id)!
          .set(up.permission_key, up.effect as PermissionEffect);
      });

      setCache(newCache);
    } catch (err: any) {
      console.error('Error loading permissions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
