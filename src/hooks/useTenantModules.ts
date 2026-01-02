import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TenantModule {
  module_code: string;
  is_enabled: boolean;
}

export function useTenantModules(tenantId: string | null) {
  const [modules, setModules] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    loadModules();
  }, [tenantId]);

  const loadModules = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenant_modules')
        .select('module_code, is_enabled')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const moduleMap = new Map<string, boolean>();

      if (data && data.length > 0) {
        data.forEach((mod: TenantModule) => {
          moduleMap.set(mod.module_code, mod.is_enabled);
        });
      }

      setModules(moduleMap);
    } catch (error) {
      console.error('Error loading tenant modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const isModuleEnabled = (moduleCode: string): boolean => {
    if (modules.size === 0) {
      return true;
    }

    return modules.get(moduleCode) !== false;
  };

  return {
    modules,
    loading,
    isModuleEnabled,
  };
}
