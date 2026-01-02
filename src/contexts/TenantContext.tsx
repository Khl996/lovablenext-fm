import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface Tenant {
  id: string;
  name: string;
  name_ar: string;
  subscription_status: string;
  logo_url?: string;
}

interface TenantContextType {
  selectedTenant: Tenant | null;
  setSelectedTenant: (tenant: Tenant | null) => void;
  availableTenants: Tenant[];
  loading: boolean;
  isViewingAsTenant: boolean;
  clearTenantSelection: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useCurrentUser();

  const isPlatformAdmin = profile?.role === 'platform_owner' ||
                          profile?.role === 'platform_admin' ||
                          profile?.is_super_admin;

  useEffect(() => {
    if (isPlatformAdmin) {
      fetchTenants();
    } else {
      setLoading(false);
    }
  }, [isPlatformAdmin]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, name_ar, subscription_status, logo_url')
        .order('name');

      if (error) throw error;
      setAvailableTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearTenantSelection = () => {
    setSelectedTenant(null);
  };

  return (
    <TenantContext.Provider
      value={{
        selectedTenant,
        setSelectedTenant,
        availableTenants,
        loading,
        isViewingAsTenant: !!selectedTenant,
        clearTenantSelection,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
