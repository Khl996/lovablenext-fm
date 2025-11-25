/**
 * Role-Based Access Control (RBAC) Configuration
 * Defines what each role can see and do across all modules
 */

export type RoleCode = 
  | 'global_admin'
  | 'hospital_admin'
  | 'facility_manager'
  | 'maintenance_manager'
  | 'engineer'
  | 'supervisor'
  | 'technician'
  | 'reporter';

export type DashboardView = 'executive' | 'manager' | 'technician' | 'reporter' | 'minimal';

export interface RoleConfig {
  code: RoleCode;
  dashboardView: DashboardView;
  canAccessAdmin: boolean;
  modules: {
    facilities: { view: boolean; manage: boolean };
    assets: { view: boolean; manage: boolean; export: boolean };
    workOrders: { 
      view: 'all' | 'team' | 'own';
      create: boolean;
      startWork: boolean;
      completeWork: boolean;
      approve: boolean;
      reviewAsEngineer: boolean;
      finalApprove: boolean;
      reject: boolean;
      reassign: boolean;
      update: boolean;
    };
    inventory: { view: boolean; manage: boolean; transactions: boolean; reports: boolean };
    maintenance: { view: boolean; manage: boolean };
    teams: { view: boolean; manage: boolean };
    operationsLog: { view: boolean; create: boolean };
  };
}

export const ROLE_CONFIGS: Record<RoleCode, RoleConfig> = {
  global_admin: {
    code: 'global_admin',
    dashboardView: 'executive',
    canAccessAdmin: true,
    modules: {
      facilities: { view: true, manage: true },
      assets: { view: true, manage: true, export: true },
      workOrders: {
        view: 'all',
        create: true,
        startWork: true,
        completeWork: true,
        approve: true,
        reviewAsEngineer: true,
        finalApprove: true,
        reject: true,
        reassign: true,
        update: true,
      },
      inventory: { view: true, manage: true, transactions: true, reports: true },
      maintenance: { view: true, manage: true },
      teams: { view: true, manage: true },
      operationsLog: { view: true, create: true },
    },
  },

  hospital_admin: {
    code: 'hospital_admin',
    dashboardView: 'executive',
    canAccessAdmin: true,
    modules: {
      facilities: { view: true, manage: true },
      assets: { view: true, manage: true, export: true },
      workOrders: {
        view: 'all',
        create: true,
        startWork: false,
        completeWork: false,
        approve: true,
        reviewAsEngineer: true,
        finalApprove: true,
        reject: true,
        reassign: true,
        update: true,
      },
      inventory: { view: true, manage: true, transactions: true, reports: true },
      maintenance: { view: true, manage: true },
      teams: { view: true, manage: true },
      operationsLog: { view: true, create: false },
    },
  },

  facility_manager: {
    code: 'facility_manager',
    dashboardView: 'manager',
    canAccessAdmin: true,
    modules: {
      facilities: { view: true, manage: true },
      assets: { view: true, manage: true, export: true },
      workOrders: {
        view: 'all',
        create: true,
        startWork: false,
        completeWork: false,
        approve: true,
        reviewAsEngineer: false,
        finalApprove: true,
        reject: true,
        reassign: true,
        update: true,
      },
      inventory: { view: true, manage: true, transactions: true, reports: true },
      maintenance: { view: true, manage: false },
      teams: { view: true, manage: true },
      operationsLog: { view: true, create: false },
    },
  },

  maintenance_manager: {
    code: 'maintenance_manager',
    dashboardView: 'manager',
    canAccessAdmin: true,
    modules: {
      facilities: { view: true, manage: false },
      assets: { view: true, manage: false, export: false },
      workOrders: {
        view: 'all',
        create: true,
        startWork: false,
        completeWork: false,
        approve: false,
        reviewAsEngineer: true,
        finalApprove: false,
        reject: false,
        reassign: true,
        update: true,
      },
      inventory: { view: true, manage: true, transactions: true, reports: true },
      maintenance: { view: true, manage: true },
      teams: { view: true, manage: true },
      operationsLog: { view: true, create: false },
    },
  },

  engineer: {
    code: 'engineer',
    dashboardView: 'manager',
    canAccessAdmin: false,
    modules: {
      facilities: { view: true, manage: false },
      assets: { view: true, manage: false, export: false },
      workOrders: {
        view: 'all',
        create: true,
        startWork: false,
        completeWork: false,
        approve: false,
        reviewAsEngineer: true,
        finalApprove: false,
        reject: false,
        reassign: true,
        update: true,
      },
      inventory: { view: true, manage: false, transactions: false, reports: true },
      maintenance: { view: true, manage: true },
      teams: { view: true, manage: false },
      operationsLog: { view: true, create: false },
    },
  },

  supervisor: {
    code: 'supervisor',
    dashboardView: 'technician',
    canAccessAdmin: false,
    modules: {
      facilities: { view: true, manage: false },
      assets: { view: true, manage: false, export: false },
      workOrders: {
        view: 'team',
        create: true,
        startWork: true,
        completeWork: true,
        approve: true,
        reviewAsEngineer: false,
        finalApprove: false,
        reject: true,
        reassign: true,
        update: true,
      },
      inventory: { view: true, manage: false, transactions: true, reports: false },
      maintenance: { view: true, manage: false },
      teams: { view: true, manage: false },
      operationsLog: { view: false, create: true },
    },
  },

  technician: {
    code: 'technician',
    dashboardView: 'technician',
    canAccessAdmin: false,
    modules: {
      facilities: { view: true, manage: false },
      assets: { view: true, manage: false, export: false },
      workOrders: {
        view: 'team',
        create: true,
        startWork: true,
        completeWork: true,
        approve: false,
        reviewAsEngineer: false,
        finalApprove: false,
        reject: true,
        reassign: false,
        update: false,
      },
      inventory: { view: true, manage: false, transactions: true, reports: false },
      maintenance: { view: false, manage: false },
      teams: { view: false, manage: false },
      operationsLog: { view: false, create: true },
    },
  },

  reporter: {
    code: 'reporter',
    dashboardView: 'reporter',
    canAccessAdmin: false,
    modules: {
      facilities: { view: false, manage: false },
      assets: { view: false, manage: false, export: false },
      workOrders: {
        view: 'own',
        create: true,
        startWork: false,
        completeWork: false,
        approve: false,
        reviewAsEngineer: false,
        finalApprove: false,
        reject: false,
        reassign: false,
        update: false,
      },
      inventory: { view: false, manage: false, transactions: false, reports: false },
      maintenance: { view: false, manage: false },
      teams: { view: false, manage: false },
      operationsLog: { view: false, create: false },
    },
  },
};

/**
 * Get role configuration for a user based on their roles
 */
export function getUserRoleConfig(roleCodes: string[]): RoleConfig | null {
  // Priority order: global_admin > hospital_admin > facility_manager > maintenance_manager > engineer > supervisor > technician > reporter
  const priorityOrder: RoleCode[] = [
    'global_admin',
    'hospital_admin', 
    'facility_manager',
    'maintenance_manager',
    'engineer',
    'supervisor',
    'technician',
    'reporter',
  ];

  for (const roleCode of priorityOrder) {
    if (roleCodes.includes(roleCode)) {
      return ROLE_CONFIGS[roleCode];
    }
  }

  return null;
}

/**
 * Check if user has access to a specific module action
 */
export function hasModuleAccess(
  roleConfig: RoleConfig | null,
  module: keyof RoleConfig['modules'],
  action: string
): boolean {
  if (!roleConfig) return false;
  
  const moduleConfig = roleConfig.modules[module];
  if (!moduleConfig) return false;

  // @ts-ignore - dynamic access
  return moduleConfig[action] === true;
}
