import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { usePermissions, type UserPermissionsInfo } from './usePermissions';

type Profile = {
  id: string;
  full_name: string;
  full_name_ar: string | null;
  email: string;
  phone: string | null;
  hospital_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type UserRole = {
  id: string;
  user_id: string;
  role: 'global_admin' | 'hospital_admin' | 'facility_manager' | 'maintenance_manager' | 'supervisor' | 'technician' | 'reporter';
  hospital_id: string | null;
  created_at: string;
};

export type CurrentUserInfo = {
  user: User | null;
  profile: Profile | null;
  roles: UserRole[];
  primaryRole: UserRole['role'] | null;
  hospitalId: string | null;
  loading: boolean;
  error?: string;
  isGlobalAdmin: boolean;
  isHospitalAdmin: boolean;
  isFacilityManager: boolean;
  canManageUsers: boolean;
  canManageHospitals: boolean;
  permissions: UserPermissionsInfo;
  refetch: () => Promise<void>;
};

export function useCurrentUser(): CurrentUserInfo {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
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

      // Get roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authUser.id);

      if (rolesError) throw rolesError;
      setRoles(rolesData || []);

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
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Determine primary role (global_admin has priority)
  const primaryRole = roles.find(r => r.role === 'global_admin')?.role || roles[0]?.role || null;
  const hospitalId = profile?.hospital_id || roles[0]?.hospital_id || null;

  // Derived permissions
  const isGlobalAdmin = roles.some(r => r.role === 'global_admin');
  const isHospitalAdmin = roles.some(r => r.role === 'hospital_admin');
  const isFacilityManager = roles.some(r => r.role === 'facility_manager');
  const canManageUsers = isGlobalAdmin || isHospitalAdmin || isFacilityManager;
  const canManageHospitals = isGlobalAdmin;

  // Use permissions hook
  const userRoleNames = roles.map(r => r.role);
  const permissions = usePermissions(user?.id || null, userRoleNames);

  return {
    user,
    profile,
    roles,
    primaryRole,
    hospitalId,
    loading,
    error,
    isGlobalAdmin,
    isHospitalAdmin,
    isFacilityManager,
    canManageUsers,
    canManageHospitals,
    permissions,
    refetch: loadUserData,
  };
}
