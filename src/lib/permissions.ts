/**
 * Permission Utilities
 * Centralized permission checking and management
 */

import { supabase } from '@/integrations/supabase/client';

export type PermissionKey = string;
export type PermissionEffect = 'grant' | 'deny';

/**
 * Check if user has a specific permission
 * This function calls the database function for server-side validation
 */
export async function hasPermission(
  userId: string,
  permissionKey: PermissionKey,
  hospitalId?: string | null
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_permission_v2', {
      _user_id: userId,
      _permission_key: permissionKey,
      _hospital_id: hospitalId || null,
    });

    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in hasPermission:', error);
    return false;
  }
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissionKeys: PermissionKey[],
  hospitalId?: string | null
): Promise<boolean> {
  const results = await Promise.all(
    permissionKeys.map((key) => hasPermission(userId, key, hospitalId))
  );
  return results.some((r) => r);
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissionKeys: PermissionKey[],
  hospitalId?: string | null
): Promise<boolean> {
  const results = await Promise.all(
    permissionKeys.map((key) => hasPermission(userId, key, hospitalId))
  );
  return results.every((r) => r);
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<PermissionKey[]> {
  try {
    // Get permissions from custom roles
    const { data: customRolesData, error: customRolesError } = await supabase
      .from('custom_user_roles')
      .select(`
        role_code,
        role_permissions!role_permissions_role_code_fkey(permission_key, allowed)
      `)
      .eq('user_id', userId);

    if (customRolesError) throw customRolesError;

    // Get permissions from old app_role system
    const { data: oldRolesData, error: oldRolesError } = await supabase
      .from('user_roles')
      .select(`
        role,
        role_permissions!role_permissions_role_fkey(permission_key, allowed)
      `)
      .eq('user_id', userId);

    if (oldRolesError) throw oldRolesError;

    // Get user-specific permission overrides
    const { data: userPermsData, error: userPermsError } = await supabase
      .from('user_permissions')
      .select('permission_key, effect')
      .eq('user_id', userId);

    if (userPermsError) throw userPermsError;

    // Collect all permissions from roles
    const rolePermissions = new Set<string>();
    
    // From custom roles
    customRolesData?.forEach((cr: any) => {
      cr.role_permissions?.forEach((rp: any) => {
        if (rp.allowed) {
          rolePermissions.add(rp.permission_key);
        }
      });
    });

    // From old roles
    oldRolesData?.forEach((ur: any) => {
      ur.role_permissions?.forEach((rp: any) => {
        if (rp.allowed) {
          rolePermissions.add(rp.permission_key);
        }
      });
    });

    // Apply user-specific overrides
    userPermsData?.forEach((up) => {
      if (up.effect === 'grant') {
        rolePermissions.add(up.permission_key);
      } else if (up.effect === 'deny') {
        rolePermissions.delete(up.permission_key);
      }
    });

    return Array.from(rolePermissions);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Permission constants for commonly used permissions
 */
export const PERMISSIONS = {
  // Admin
  MANAGE_HOSPITALS: 'manage_hospitals',
  MANAGE_PERMISSIONS: 'manage_permissions',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_USERS: 'manage_users',
  
  // Facilities
  VIEW_FACILITIES: 'view_facilities',
  MANAGE_FACILITIES: 'manage_facilities',
  MANAGE_LOCATIONS: 'manage_locations',
  
  // Assets
  VIEW_ASSETS: 'view_assets',
  MANAGE_ASSETS: 'manage_assets',
  EXPORT_ASSETS: 'export_assets',
  
  // Work Orders
  VIEW_WORK_ORDERS: 'view_work_orders',
  CREATE_WORK_ORDERS: 'create_work_orders',
  EDIT_WORK_ORDERS: 'edit_work_orders',
  DELETE_WORK_ORDERS: 'delete_work_orders',
  ASSIGN_WORK_ORDERS: 'assign_work_orders',
  APPROVE_WORK_ORDERS: 'approve_work_orders',
  CLOSE_WORK_ORDERS: 'close_work_orders',
  WO_START_WORK: 'work_orders.start_work',
  WO_COMPLETE_WORK: 'work_orders.complete_work',
  WO_APPROVE: 'work_orders.approve',
  WO_REVIEW_AS_ENGINEER: 'work_orders.review_as_engineer',
  WO_FINAL_APPROVE: 'work_orders.final_approve',
  WO_REJECT: 'work_orders.reject',
  WO_REASSIGN: 'work_orders.reassign',
  WO_UPDATE: 'work_orders.update',
  
  // Teams
  VIEW_TEAMS: 'view_teams',
  MANAGE_TEAMS: 'manage_teams',
  
  // Inventory
  VIEW_INVENTORY: 'inventory.view',
  MANAGE_INVENTORY: 'inventory.manage',
  INVENTORY_TRANSACTIONS: 'inventory.transactions',
  INVENTORY_REPORTS: 'inventory.reports',
  
  // Maintenance
  VIEW_MAINTENANCE: 'view_maintenance',
  MANAGE_MAINTENANCE: 'manage_maintenance',
  
  // Analytics
  VIEW_ANALYTICS: 'view_analytics',
} as const;

/**
 * Role-based permission presets
 * These define the expected permissions for each role
 */
export const ROLE_PERMISSIONS = {
  global_admin: Object.values(PERMISSIONS),
  
  hospital_admin: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.VIEW_FACILITIES,
    PERMISSIONS.MANAGE_FACILITIES,
    PERMISSIONS.MANAGE_LOCATIONS,
    PERMISSIONS.VIEW_ASSETS,
    PERMISSIONS.MANAGE_ASSETS,
    PERMISSIONS.VIEW_WORK_ORDERS,
    PERMISSIONS.CREATE_WORK_ORDERS,
    PERMISSIONS.EDIT_WORK_ORDERS,
    PERMISSIONS.ASSIGN_WORK_ORDERS,
    PERMISSIONS.APPROVE_WORK_ORDERS,
    PERMISSIONS.WO_APPROVE,
    PERMISSIONS.WO_REVIEW_AS_ENGINEER,
    PERMISSIONS.WO_FINAL_APPROVE,
    PERMISSIONS.WO_REASSIGN,
    PERMISSIONS.WO_UPDATE,
    PERMISSIONS.VIEW_TEAMS,
    PERMISSIONS.MANAGE_TEAMS,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  
  facility_manager: [
    PERMISSIONS.VIEW_FACILITIES,
    PERMISSIONS.MANAGE_FACILITIES,
    PERMISSIONS.MANAGE_LOCATIONS,
    PERMISSIONS.VIEW_ASSETS,
    PERMISSIONS.MANAGE_ASSETS,
    PERMISSIONS.VIEW_WORK_ORDERS,
    PERMISSIONS.CREATE_WORK_ORDERS,
    PERMISSIONS.EDIT_WORK_ORDERS,
    PERMISSIONS.ASSIGN_WORK_ORDERS,
    PERMISSIONS.APPROVE_WORK_ORDERS,
    PERMISSIONS.WO_APPROVE,
    PERMISSIONS.WO_REVIEW_AS_ENGINEER,
    PERMISSIONS.WO_REASSIGN,
    PERMISSIONS.WO_UPDATE,
    PERMISSIONS.VIEW_TEAMS,
    PERMISSIONS.MANAGE_TEAMS,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  
  maintenance_manager: [
    PERMISSIONS.VIEW_FACILITIES,
    PERMISSIONS.VIEW_ASSETS,
    PERMISSIONS.VIEW_WORK_ORDERS,
    PERMISSIONS.CREATE_WORK_ORDERS,
    PERMISSIONS.ASSIGN_WORK_ORDERS,
    PERMISSIONS.WO_REVIEW_AS_ENGINEER,
    PERMISSIONS.WO_REASSIGN,
    PERMISSIONS.WO_UPDATE,
    PERMISSIONS.VIEW_TEAMS,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.VIEW_MAINTENANCE,
    PERMISSIONS.MANAGE_MAINTENANCE,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  
  supervisor: [
    PERMISSIONS.VIEW_FACILITIES,
    PERMISSIONS.VIEW_ASSETS,
    PERMISSIONS.VIEW_WORK_ORDERS,
    PERMISSIONS.CREATE_WORK_ORDERS,
    PERMISSIONS.ASSIGN_WORK_ORDERS,
    PERMISSIONS.WO_APPROVE,
    PERMISSIONS.WO_REASSIGN,
    PERMISSIONS.WO_UPDATE,
    PERMISSIONS.VIEW_TEAMS,
    PERMISSIONS.VIEW_INVENTORY,
  ],
  
  senior_technician: [
    PERMISSIONS.VIEW_FACILITIES,
    PERMISSIONS.VIEW_ASSETS,
    PERMISSIONS.VIEW_WORK_ORDERS,
    PERMISSIONS.CREATE_WORK_ORDERS,
    PERMISSIONS.WO_START_WORK,
    PERMISSIONS.WO_COMPLETE_WORK,
    PERMISSIONS.WO_REJECT,
    PERMISSIONS.VIEW_INVENTORY,
  ],
  
  technician: [
    PERMISSIONS.VIEW_FACILITIES,
    PERMISSIONS.VIEW_ASSETS,
    PERMISSIONS.VIEW_WORK_ORDERS,
    PERMISSIONS.WO_START_WORK,
    PERMISSIONS.WO_COMPLETE_WORK,
    PERMISSIONS.WO_REJECT,
    PERMISSIONS.VIEW_INVENTORY,
  ],
} as const;
