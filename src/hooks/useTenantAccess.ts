import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AccessibleTenant {
  tenant_id: string;
  tenant_name: string;
  tenant_name_ar: string;
  access_type: 'platform_full' | 'platform_assigned' | 'tenant_member';
  roles: string[];
}

export interface TenantAccessInfo {
  loading: boolean;
  error?: string;
  accessibleTenants: AccessibleTenant[];
  hasAccessToTenant: (tenantId: string) => boolean;
  getUserRolesInTenant: (tenantId: string) => string[];
  isPlatformLevel: boolean;
  refetch: () => Promise<void>;
}

export function useTenantAccess(userId: string | null): TenantAccessInfo {
  const [accessibleTenants, setAccessibleTenants] = useState<AccessibleTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadTenantAccess = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(undefined);

      const { data, error: rpcError } = await supabase.rpc('get_accessible_tenants', {
        p_user_id: userId
      });

      if (rpcError) throw rpcError;

      setAccessibleTenants(data || []);
    } catch (err: any) {
      console.error('Error loading tenant access:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTenantAccess();
  }, [loadTenantAccess]);

  const hasAccessToTenant = useCallback(
    (tenantId: string): boolean => {
      return accessibleTenants.some(t => t.tenant_id === tenantId);
    },
    [accessibleTenants]
  );

  const getUserRolesInTenant = useCallback(
    (tenantId: string): string[] => {
      const tenant = accessibleTenants.find(t => t.tenant_id === tenantId);
      return tenant?.roles || [];
    },
    [accessibleTenants]
  );

  const isPlatformLevel = accessibleTenants.some(
    t => t.access_type === 'platform_full' || t.access_type === 'platform_assigned'
  );

  return {
    loading,
    error,
    accessibleTenants,
    hasAccessToTenant,
    getUserRolesInTenant,
    isPlatformLevel,
    refetch: loadTenantAccess,
  };
}
