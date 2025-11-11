import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';

export type LookupItem = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  level?: number;
  color?: string;
  category?: string;
  description?: string;
  is_active: boolean;
  display_order: number;
};

export type LookupTableName =
  | 'priorities'
  | 'work_order_statuses'
  | 'asset_statuses'
  | 'asset_categories'
  | 'work_types'
  | 'team_roles';

const tableMap = {
  priorities: 'lookup_priorities',
  work_order_statuses: 'lookup_work_order_statuses',
  asset_statuses: 'lookup_asset_statuses',
  asset_categories: 'lookup_asset_categories',
  work_types: 'lookup_work_types',
  team_roles: 'lookup_team_roles',
} as const;

/**
 * Hook to load and manage lookup table data
 * @param tableName - The lookup table to load
 * @param autoLoad - Whether to automatically load data on mount (default: true)
 * @returns Loading state, data, error, and reload function
 */
export function useLookupTable(tableName: LookupTableName, autoLoad: boolean = true) {
  const { hospitalId } = useCurrentUser();
  const [data, setData] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!hospitalId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: items, error: fetchError } = await supabase
        .from(tableMap[tableName] as any)
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setData((items as unknown as LookupItem[]) || []);
    } catch (err: any) {
      console.error(`Error loading ${tableName}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad && hospitalId) {
      loadData();
    }
  }, [hospitalId, tableName, autoLoad]);

  return {
    data,
    loading,
    error,
    reload: loadData,
  };
}

/**
 * Hook to get a single item by code from a lookup table
 */
export function useLookupItem(tableName: LookupTableName, code: string | null) {
  const { data, loading, error } = useLookupTable(tableName);
  
  const item = code ? data.find(item => item.code === code) : null;

  return {
    item,
    loading,
    error,
  };
}

/**
 * Hook to load multiple lookup tables at once
 * Useful for pages that need several lookup tables
 */
export function useLookupTables(tableNames: LookupTableName[]) {
  const [lookups, setLookups] = useState<Record<LookupTableName, LookupItem[]>>({} as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hospitalId } = useCurrentUser();

  const loadAllData = async () => {
    if (!hospitalId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const promises = tableNames.map(async (tableName) => {
        const { data, error } = await supabase
          .from(tableMap[tableName] as any)
          .select('*')
          .eq('hospital_id', hospitalId)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('name', { ascending: true});

        if (error) throw error;
        return { tableName, data: (data as unknown as LookupItem[]) || [] };
      });

      const results = await Promise.all(promises);
      
      const lookupsObj = results.reduce((acc, { tableName, data }) => {
        acc[tableName] = data;
        return acc;
      }, {} as Record<LookupTableName, LookupItem[]>);

      setLookups(lookupsObj);
    } catch (err: any) {
      console.error('Error loading lookup tables:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId && tableNames.length > 0) {
      loadAllData();
    }
  }, [hospitalId, JSON.stringify(tableNames)]);

  return {
    lookups,
    loading,
    error,
    reload: loadAllData,
  };
}

/**
 * Helper function to get display name based on language
 */
export function getLookupName(item: LookupItem | null, language: 'ar' | 'en'): string {
  if (!item) return '';
  return language === 'ar' ? item.name_ar : item.name;
}

/**
 * Helper function to initialize default lookup data for a hospital
 */
export async function initializeDefaultLookups(hospitalId: string) {
  try {
    // Initialize priorities
    const priorities = [
      { code: 'low', name: 'Low', name_ar: 'منخفضة', level: 1, color: '#10b981', display_order: 1 },
      { code: 'medium', name: 'Medium', name_ar: 'متوسطة', level: 2, color: '#f59e0b', display_order: 2 },
      { code: 'high', name: 'High', name_ar: 'عالية', level: 3, color: '#ef4444', display_order: 3 },
      { code: 'urgent', name: 'Urgent', name_ar: 'عاجلة', level: 4, color: '#dc2626', display_order: 4 },
    ];

    // Initialize work order statuses
    const workOrderStatuses = [
      { code: 'pending', name: 'Pending', name_ar: 'قيد الانتظار', category: 'open', color: '#6b7280', display_order: 1 },
      { code: 'assigned', name: 'Assigned', name_ar: 'محددة', category: 'open', color: '#3b82f6', display_order: 2 },
      { code: 'in_progress', name: 'In Progress', name_ar: 'قيد التنفيذ', category: 'in_progress', color: '#f59e0b', display_order: 3 },
      { code: 'completed', name: 'Completed', name_ar: 'مكتملة', category: 'closed', color: '#10b981', display_order: 4 },
      { code: 'approved', name: 'Approved', name_ar: 'معتمدة', category: 'closed', color: '#059669', display_order: 5 },
      { code: 'cancelled', name: 'Cancelled', name_ar: 'ملغية', category: 'closed', color: '#dc2626', display_order: 6 },
    ];

    // Initialize asset statuses
    const assetStatuses = [
      { code: 'active', name: 'Active', name_ar: 'نشط', category: 'operational', color: '#10b981', display_order: 1 },
      { code: 'maintenance', name: 'Under Maintenance', name_ar: 'تحت الصيانة', category: 'maintenance', color: '#f59e0b', display_order: 2 },
      { code: 'out_of_service', name: 'Out of Service', name_ar: 'خارج الخدمة', category: 'inactive', color: '#ef4444', display_order: 3 },
      { code: 'retired', name: 'Retired', name_ar: 'متقاعد', category: 'inactive', color: '#6b7280', display_order: 4 },
    ];

    // Initialize asset categories
    const assetCategories = [
      { code: 'electrical', name: 'Electrical', name_ar: 'كهربائي', display_order: 1 },
      { code: 'mechanical', name: 'Mechanical', name_ar: 'ميكانيكي', display_order: 2 },
      { code: 'hvac', name: 'HVAC', name_ar: 'تكييف وتهوية', display_order: 3 },
      { code: 'plumbing', name: 'Plumbing', name_ar: 'سباكة', display_order: 4 },
      { code: 'civil', name: 'Civil', name_ar: 'مدني', display_order: 5 },
      { code: 'biomedical', name: 'Biomedical', name_ar: 'أجهزة طبية', display_order: 6 },
      { code: 'it', name: 'IT Equipment', name_ar: 'معدات تقنية', display_order: 7 },
      { code: 'furniture', name: 'Furniture', name_ar: 'أثاث', display_order: 8 },
    ];

    // Initialize work types
    const workTypes = [
      { code: 'emergency', name: 'Emergency', name_ar: 'طارئ', display_order: 1 },
      { code: 'routine', name: 'Routine', name_ar: 'دوري', display_order: 2 },
      { code: 'preventive', name: 'Preventive', name_ar: 'وقائي', display_order: 3 },
      { code: 'corrective', name: 'Corrective', name_ar: 'تصحيحي', display_order: 4 },
    ];

    // Initialize team roles
    const teamRoles = [
      { code: 'technician', name: 'Technician', name_ar: 'فني', level: 1, display_order: 1 },
      { code: 'senior_technician', name: 'Senior Technician', name_ar: 'فني أول', level: 2, display_order: 2 },
      { code: 'supervisor', name: 'Supervisor', name_ar: 'مشرف', level: 3, display_order: 3 },
      { code: 'lead', name: 'Team Lead', name_ar: 'قائد الفريق', level: 4, display_order: 4 },
    ];

    // Insert all data
    const inserts = await Promise.all([
      supabase.from('lookup_priorities').insert(priorities.map(p => ({ ...p, hospital_id: hospitalId }))),
      supabase.from('lookup_work_order_statuses').insert(workOrderStatuses.map(s => ({ ...s, hospital_id: hospitalId }))),
      supabase.from('lookup_asset_statuses').insert(assetStatuses.map(s => ({ ...s, hospital_id: hospitalId }))),
      supabase.from('lookup_asset_categories').insert(assetCategories.map(c => ({ ...c, hospital_id: hospitalId }))),
      supabase.from('lookup_work_types').insert(workTypes.map(w => ({ ...w, hospital_id: hospitalId }))),
      supabase.from('lookup_team_roles').insert(teamRoles.map(r => ({ ...r, hospital_id: hospitalId }))),
    ]);

    const errors = inserts.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Some lookups failed to initialize:', errors);
      throw new Error('Failed to initialize all lookup tables');
    }

    return true;
  } catch (error) {
    console.error('Error initializing default lookups:', error);
    throw error;
  }
}