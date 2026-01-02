import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { usePermissions, type UserPermissionsInfo } from './usePermissions';
import { getUserRoleConfig, type RoleConfig } from '@/lib/rolePermissions';

type Profile = {
  id: string;
  tenant_id: string | null;
  full_name: string;
  full_name_ar: string | null;
  email: string;
  phone: string | null;
  hospital_id?: string | null;
  avatar_url: string | null;
  role: string;
  is_super_admin: boolean | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
};

type UserRole = {
  id: string;
  user_id: string;
  role: 'global_admin' | 'hospital_admin' | 'facility_manager' | 'maintenance_manager' | 'supervisor' | 'technician' | 'reporter' | 'engineer';
  hospital_id: string | null;
  created_at: string;
};

type CustomUserRole = {
  id: string;
  user_id: string;
  role_code: string;
  hospital_id: string | null;
  created_at: string;
};

export type CurrentUserInfo = {
  user: User | null;
  profile: Profile | null;
  roles: UserRole[];
  customRoles: CustomUserRole[];
  primaryRole: UserRole['role'] | null;
  hospitalId: string | null;
  loading: boolean;
  error?: string;
  isGlobalAdmin: boolean;
  isHospitalAdmin: boolean;
  isFacilityManager: boolean;
  canManageUsers: boolean;
  canManageHospitals: boolean;
  canAccessAdmin: boolean; // NEW: Based on database permissions
  permissions: UserPermissionsInfo;
  roleConfig: RoleConfig | null; // Only for Work Orders (perfect system)
  refetch: () => Promise<void>;
};

export function useCurrentUser(): CurrentUserInfo {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomUserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(undefined);

      // Get authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      if (!authUser) {
        setUser(null);
        setProfile(null);
        setRoles([]);
        setCustomRoles([]);
        setLoading(false);
        return;
      }

      setUser(authUser);

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      // Create profile if it doesn't exist
      if (!profileData) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: authUser.id,
            email: authUser.email!,
            full_name: authUser.user_metadata?.full_name || authUser.email!,
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newProfile);
      } else {
        setProfile(profileData);
      }

      // Get roles (old system - app_role) - optional, may not exist
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authUser.id);

      setRoles(rolesData || []);
      setCustomRoles([]);

    } catch (err: any) {
      console.error('Error loading user data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUserData();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setRoles([]);
        setCustomRoles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Determine primary role (global_admin has priority)
  const primaryRole = roles.find(r => r.role === 'global_admin')?.role || roles[0]?.role || null;
  const hospitalId = profile?.tenant_id || profile?.hospital_id || roles[0]?.hospital_id || customRoles[0]?.hospital_id || null;

  // Derived permissions
  const isGlobalAdmin = roles.some(r => r.role === 'global_admin');
  const isHospitalAdmin = roles.some(r => r.role === 'hospital_admin') || customRoles.some(r => r.role_code === 'hospital_admin');
  const isFacilityManager = roles.some(r => r.role === 'facility_manager') || customRoles.some(r => r.role_code === 'facility_manager');
  const canManageUsers = isGlobalAdmin || isHospitalAdmin || isFacilityManager;
  const canManageHospitals = isGlobalAdmin;

  // Use permissions hook with both old and new role systems
  const userRoleNames = roles.map(r => r.role);
  const customRoleCodes = customRoles.map(r => r.role_code);
  const permissions = usePermissions(user?.id || null, userRoleNames, customRoleCodes, hospitalId);

  // Get role configuration (normalize custom codes like 'eng' to standard app roles)
  // NOTE: roleConfig is ONLY used for Work Orders (already perfect)
  const normalizedCustomRoleCodes = customRoleCodes.map(code => {
    if (code.toLowerCase() === 'eng') return 'engineer';
    return code;
  });
  const allRoleCodes = [...userRoleNames, ...normalizedCustomRoleCodes];
  const roleConfig = getUserRoleConfig(allRoleCodes);

  // NEW: canAccessAdmin based on database permissions
  const canAccessAdmin = 
    permissions.hasAnyPermission([
      'facilities.manage',
      'assets.manage',
      'inventory.manage',
      'maintenance.manage',
      'teams.manage',
      'users.manage',
      'settings.access',
    ]);

  return {
    user,
    profile,
    roles,
    customRoles,
    primaryRole,
    hospitalId,
    loading: loading || permissions.loading,
    error,
    isGlobalAdmin,
    isHospitalAdmin,
    isFacilityManager,
    canManageUsers,
    canManageHospitals,
    canAccessAdmin,
    permissions,
    roleConfig,
    refetch: loadUserData,
  };
}
