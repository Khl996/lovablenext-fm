/**
 * Role-Based Access Control (RBAC) Configuration
 *
 * Two-Level Role System:
 * 1. Platform Level: Roles for managing the entire SaaS platform
 * 2. Tenant Level: Roles for managing individual organizations
 */

export type PlatformRoleCode =
  | 'platform_owner'
  | 'platform_admin'
  | 'platform_support'
  | 'platform_accountant';

export type TenantRoleCode =
  | 'tenant_admin'
  | 'facility_manager'
  | 'maintenance_manager'
  | 'engineer'
  | 'supervisor'
  | 'technician'
  | 'reporter';

export type RoleCode = PlatformRoleCode | TenantRoleCode;

export type DashboardView = 'executive' | 'manager' | 'technician' | 'reporter' | 'minimal';

export interface RoleConfig {
  code: RoleCode;
  level: 'platform' | 'tenant';
  dashboardView: DashboardView;
  canAccessAdmin: boolean;
  canAccessPlatformAdmin: boolean;
  modules: {
    dashboard: { executive: boolean; manager: boolean; technician: boolean; reporter: boolean };
    facilities: { view: boolean; manage: boolean };
    assets: { view: boolean; manage: boolean; export: boolean };
    workOrders: {
      view: 'all' | 'team' | 'own' | 'none';
      create: boolean;
      startWork: boolean;
      completeWork: boolean;
      supervisorApprove: boolean;
      engineerReview: boolean;
      finalApprove: boolean;
      reject: boolean;
      reassign: boolean;
      cancel: boolean;
      reopen: boolean;
    };
    inventory: { view: boolean; manage: boolean; transactions: boolean; reports: boolean };
    maintenance: { view: boolean; manage: boolean; execute: boolean };
    calibration: { view: boolean; manage: boolean };
    contracts: { view: boolean; manage: boolean };
    sla: { view: boolean; manage: boolean };
    costs: { view: boolean; manage: boolean };
    teams: { view: boolean; manage: boolean };
    operationsLog: { view: boolean; manage: boolean };
    users: { view: boolean; manage: boolean; assignRoles: boolean; deactivate: boolean };
    roles: { view: boolean; manage: boolean; assignPermissions: boolean };
    settings: { access: boolean; manage: boolean };
    analytics: { view: boolean; export: boolean };
  };
  platformModules?: {
    tenants: { view: boolean; create: boolean; manage: boolean; delete: boolean; suspend: boolean };
    subscriptions: { view: boolean; manage: boolean };
    plans: { view: boolean; manage: boolean };
    invoices: { view: boolean; manage: boolean };
    payments: { view: boolean; manage: boolean };
    financials: { view: boolean };
    auditLogs: { view: boolean };
    platformSettings: { view: boolean; manage: boolean };
  };
}

export const PLATFORM_ROLE_CONFIGS: Record<PlatformRoleCode, RoleConfig> = {
  platform_owner: {
    code: 'platform_owner',
    level: 'platform',
    dashboardView: 'executive',
    canAccessAdmin: true,
    canAccessPlatformAdmin: true,
    modules: {
      dashboard: { executive: true, manager: true, technician: true, reporter: true },
      facilities: { view: true, manage: true },
      assets: { view: true, manage: true, export: true },
      workOrders: {
        view: 'all',
        create: true,
        startWork: true,
        completeWork: true,
        supervisorApprove: true,
        engineerReview: true,
        finalApprove: true,
        reject: true,
        reassign: true,
        cancel: true,
        reopen: true,
      },
      inventory: { view: true, manage: true, transactions: true, reports: true },
      maintenance: { view: true, manage: true, execute: true },
      calibration: { view: true, manage: true },
      contracts: { view: true, manage: true },
      sla: { view: true, manage: true },
      costs: { view: true, manage: true },
      teams: { view: true, manage: true },
      operationsLog: { view: true, manage: true },
      users: { view: true, manage: true, assignRoles: true, deactivate: true },
      roles: { view: true, manage: true, assignPermissions: true },
      settings: { access: true, manage: true },
      analytics: { view: true, export: true },
    },
    platformModules: {
      tenants: { view: true, create: true, manage: true, delete: true, suspend: true },
      subscriptions: { view: true, manage: true },
      plans: { view: true, manage: true },
      invoices: { view: true, manage: true },
      payments: { view: true, manage: true },
      financials: { view: true },
      auditLogs: { view: true },
      platformSettings: { view: true, manage: true },
    },
  },

  platform_admin: {
    code: 'platform_admin',
    level: 'platform',
    dashboardView: 'executive',
    canAccessAdmin: true,
    canAccessPlatformAdmin: true,
    modules: {
      dashboard: { executive: true, manager: true, technician: true, reporter: true },
      facilities: { view: true, manage: true },
      assets: { view: true, manage: true, export: true },
      workOrders: {
        view: 'all',
        create: true,
        startWork: true,
        completeWork: true,
        supervisorApprove: true,
        engineerReview: true,
        finalApprove: true,
        reject: true,
        reassign: true,
        cancel: true,
        reopen: true,
      },
      inventory: { view: true, manage: true, transactions: true, reports: true },
      maintenance: { view: true, manage: true, execute: true },
      calibration: { view: true, manage: true },
      contracts: { view: true, manage: true },
      sla: { view: true, manage: true },
      costs: { view: true, manage: true },
      teams: { view: true, manage: true },
      operationsLog: { view: true, manage: true },
      users: { view: true, manage: true, assignRoles: true, deactivate: true },
      roles: { view: true, manage: true, assignPermissions: true },
      settings: { access: true, manage: true },
      analytics: { view: true, export: true },
    },
    platformModules: {
      tenants: { view: true, create: true, manage: true, delete: false, suspend: true },
      subscriptions: { view: true, manage: true },
      plans: { view: true, manage: false },
      invoices: { view: true, manage: true },
      payments: { view: true, manage: true },
      financials: { view: true },
      auditLogs: { view: true },
      platformSettings: { view: true, manage: false },
    },
  },

  platform_support: {
    code: 'platform_support',
    level: 'platform',
    dashboardView: 'manager',
    canAccessAdmin: true,
    canAccessPlatformAdmin: true,
    modules: {
      dashboard: { executive: false, manager: true, technician: true, reporter: true },
      facilities: { view: true, manage: false },
      assets: { view: true, manage: false, export: false },
      workOrders: {
        view: 'all',
        create: false,
        startWork: false,
        completeWork: false,
        supervisorApprove: false,
        engineerReview: false,
        finalApprove: false,
        reject: false,
        reassign: false,
        cancel: false,
        reopen: false,
      },
      inventory: { view: true, manage: false, transactions: false, reports: true },
      maintenance: { view: true, manage: false, execute: false },
      calibration: { view: true, manage: false },
      contracts: { view: true, manage: false },
      sla: { view: true, manage: false },
      costs: { view: true, manage: false },
      teams: { view: true, manage: false },
      operationsLog: { view: true, manage: false },
      users: { view: true, manage: false, assignRoles: false, deactivate: false },
      roles: { view: true, manage: false, assignPermissions: false },
      settings: { access: true, manage: false },
      analytics: { view: true, export: false },
    },
    platformModules: {
      tenants: { view: true, create: false, manage: false, delete: false, suspend: false },
      subscriptions: { view: true, manage: false },
      plans: { view: true, manage: false },
      invoices: { view: true, manage: false },
      payments: { view: true, manage: false },
      financials: { view: false },
      auditLogs: { view: true },
      platformSettings: { view: true, manage: false },
    },
  },

  platform_accountant: {
    code: 'platform_accountant',
    level: 'platform',
    dashboardView: 'manager',
    canAccessAdmin: false,
    canAccessPlatformAdmin: true,
    modules: {
      dashboard: { executive: false, manager: true, technician: false, reporter: false },
      facilities: { view: false, manage: false },
      assets: { view: false, manage: false, export: false },
      workOrders: {
        view: 'none',
        create: false,
        startWork: false,
        completeWork: false,
        supervisorApprove: false,
        engineerReview: false,
        finalApprove: false,
        reject: false,
        reassign: false,
        cancel: false,
        reopen: false,
      },
      inventory: { view: false, manage: false, transactions: false, reports: false },
      maintenance: { view: false, manage: false, execute: false },
      calibration: { view: false, manage: false },
      contracts: { view: true, manage: false },
      sla: { view: false, manage: false },
      costs: { view: true, manage: true },
      teams: { view: false, manage: false },
      operationsLog: { view: false, manage: false },
      users: { view: false, manage: false, assignRoles: false, deactivate: false },
      roles: { view: false, manage: false, assignPermissions: false },
      settings: { access: false, manage: false },
      analytics: { view: true, export: true },
    },
    platformModules: {
      tenants: { view: true, create: false, manage: false, delete: false, suspend: false },
      subscriptions: { view: true, manage: true },
      plans: { view: true, manage: true },
      invoices: { view: true, manage: true },
      payments: { view: true, manage: true },
      financials: { view: true },
      auditLogs: { view: false },
      platformSettings: { view: false, manage: false },
    },
  },
};

export const TENANT_ROLE_CONFIGS: Record<TenantRoleCode, RoleConfig> = {
  tenant_admin: {
    code: 'tenant_admin',
    level: 'tenant',
    dashboardView: 'executive',
    canAccessAdmin: true,
    canAccessPlatformAdmin: false,
    modules: {
      dashboard: { executive: true, manager: true, technician: true, reporter: true },
      facilities: { view: true, manage: true },
      assets: { view: true, manage: true, export: true },
      workOrders: {
        view: 'all',
        create: true,
        startWork: true,
        completeWork: true,
        supervisorApprove: true,
        engineerReview: true,
        finalApprove: true,
        reject: true,
        reassign: true,
        cancel: true,
        reopen: true,
      },
      inventory: { view: true, manage: true, transactions: true, reports: true },
      maintenance: { view: true, manage: true, execute: true },
      calibration: { view: true, manage: true },
      contracts: { view: true, manage: true },
      sla: { view: true, manage: true },
      costs: { view: true, manage: true },
      teams: { view: true, manage: true },
      operationsLog: { view: true, manage: true },
      users: { view: true, manage: true, assignRoles: true, deactivate: true },
      roles: { view: true, manage: true, assignPermissions: true },
      settings: { access: true, manage: true },
      analytics: { view: true, export: true },
    },
  },

  facility_manager: {
    code: 'facility_manager',
    level: 'tenant',
    dashboardView: 'executive',
    canAccessAdmin: true,
    canAccessPlatformAdmin: false,
    modules: {
      dashboard: { executive: true, manager: true, technician: false, reporter: false },
      facilities: { view: true, manage: true },
      assets: { view: true, manage: true, export: true },
      workOrders: {
        view: 'all',
        create: true,
        startWork: false,
        completeWork: false,
        supervisorApprove: true,
        engineerReview: false,
        finalApprove: true,
        reject: true,
        reassign: true,
        cancel: false,
        reopen: false,
      },
      inventory: { view: true, manage: false, transactions: false, reports: true },
      maintenance: { view: true, manage: true, execute: false },
      calibration: { view: true, manage: false },
      contracts: { view: true, manage: false },
      sla: { view: true, manage: false },
      costs: { view: true, manage: false },
      teams: { view: true, manage: false },
      operationsLog: { view: true, manage: false },
      users: { view: true, manage: false, assignRoles: false, deactivate: false },
      roles: { view: true, manage: false, assignPermissions: false },
      settings: { access: true, manage: false },
      analytics: { view: true, export: false },
    },
  },

  maintenance_manager: {
    code: 'maintenance_manager',
    level: 'tenant',
    dashboardView: 'executive',
    canAccessAdmin: true,
    canAccessPlatformAdmin: false,
    modules: {
      dashboard: { executive: true, manager: true, technician: false, reporter: false },
      facilities: { view: true, manage: false },
      assets: { view: true, manage: true, export: true },
      workOrders: {
        view: 'all',
        create: true,
        startWork: false,
        completeWork: false,
        supervisorApprove: true,
        engineerReview: true,
        finalApprove: true,
        reject: true,
        reassign: true,
        cancel: true,
        reopen: true,
      },
      inventory: { view: true, manage: true, transactions: true, reports: true },
      maintenance: { view: true, manage: true, execute: true },
      calibration: { view: true, manage: true },
      contracts: { view: true, manage: false },
      sla: { view: true, manage: false },
      costs: { view: true, manage: true },
      teams: { view: true, manage: true },
      operationsLog: { view: true, manage: true },
      users: { view: true, manage: true, assignRoles: true, deactivate: false },
      roles: { view: true, manage: false, assignPermissions: false },
      settings: { access: true, manage: false },
      analytics: { view: true, export: false },
    },
  },

  engineer: {
    code: 'engineer',
    level: 'tenant',
    dashboardView: 'manager',
    canAccessAdmin: false,
    canAccessPlatformAdmin: false,
    modules: {
      dashboard: { executive: false, manager: true, technician: true, reporter: false },
      facilities: { view: true, manage: false },
      assets: { view: true, manage: false, export: false },
      workOrders: {
        view: 'all',
        create: true,
        startWork: false,
        completeWork: false,
        supervisorApprove: false,
        engineerReview: true,
        finalApprove: false,
        reject: true,
        reassign: true,
        cancel: false,
        reopen: false,
      },
      inventory: { view: true, manage: false, transactions: false, reports: true },
      maintenance: { view: true, manage: false, execute: false },
      calibration: { view: true, manage: false },
      contracts: { view: false, manage: false },
      sla: { view: false, manage: false },
      costs: { view: false, manage: false },
      teams: { view: true, manage: false },
      operationsLog: { view: true, manage: false },
      users: { view: false, manage: false, assignRoles: false, deactivate: false },
      roles: { view: false, manage: false, assignPermissions: false },
      settings: { access: false, manage: false },
      analytics: { view: true, export: false },
    },
  },

  supervisor: {
    code: 'supervisor',
    level: 'tenant',
    dashboardView: 'technician',
    canAccessAdmin: true,
    canAccessPlatformAdmin: false,
    modules: {
      dashboard: { executive: false, manager: false, technician: true, reporter: false },
      facilities: { view: true, manage: false },
      assets: { view: true, manage: false, export: false },
      workOrders: {
        view: 'team',
        create: true,
        startWork: true,
        completeWork: true,
        supervisorApprove: true,
        engineerReview: false,
        finalApprove: false,
        reject: true,
        reassign: true,
        cancel: false,
        reopen: false,
      },
      inventory: { view: true, manage: false, transactions: true, reports: false },
      maintenance: { view: true, manage: false, execute: true },
      calibration: { view: true, manage: false },
      contracts: { view: false, manage: false },
      sla: { view: false, manage: false },
      costs: { view: false, manage: false },
      teams: { view: true, manage: false },
      operationsLog: { view: true, manage: false },
      users: { view: false, manage: false, assignRoles: false, deactivate: false },
      roles: { view: false, manage: false, assignPermissions: false },
      settings: { access: false, manage: false },
      analytics: { view: false, export: false },
    },
  },

  technician: {
    code: 'technician',
    level: 'tenant',
    dashboardView: 'technician',
    canAccessAdmin: true,
    canAccessPlatformAdmin: false,
    modules: {
      dashboard: { executive: false, manager: false, technician: true, reporter: false },
      facilities: { view: true, manage: false },
      assets: { view: true, manage: false, export: false },
      workOrders: {
        view: 'team',
        create: true,
        startWork: true,
        completeWork: true,
        supervisorApprove: false,
        engineerReview: false,
        finalApprove: false,
        reject: true,
        reassign: false,
        cancel: false,
        reopen: false,
      },
      inventory: { view: true, manage: false, transactions: true, reports: false },
      maintenance: { view: true, manage: false, execute: true },
      calibration: { view: true, manage: false },
      contracts: { view: false, manage: false },
      sla: { view: false, manage: false },
      costs: { view: false, manage: false },
      teams: { view: false, manage: false },
      operationsLog: { view: false, manage: false },
      users: { view: false, manage: false, assignRoles: false, deactivate: false },
      roles: { view: false, manage: false, assignPermissions: false },
      settings: { access: false, manage: false },
      analytics: { view: false, export: false },
    },
  },

  reporter: {
    code: 'reporter',
    level: 'tenant',
    dashboardView: 'reporter',
    canAccessAdmin: false,
    canAccessPlatformAdmin: false,
    modules: {
      dashboard: { executive: false, manager: false, technician: false, reporter: true },
      facilities: { view: false, manage: false },
      assets: { view: false, manage: false, export: false },
      workOrders: {
        view: 'own',
        create: true,
        startWork: false,
        completeWork: false,
        supervisorApprove: false,
        engineerReview: false,
        finalApprove: false,
        reject: false,
        reassign: false,
        cancel: false,
        reopen: false,
      },
      inventory: { view: false, manage: false, transactions: false, reports: false },
      maintenance: { view: false, manage: false, execute: false },
      calibration: { view: false, manage: false },
      contracts: { view: false, manage: false },
      sla: { view: false, manage: false },
      costs: { view: false, manage: false },
      teams: { view: false, manage: false },
      operationsLog: { view: false, manage: false },
      users: { view: false, manage: false, assignRoles: false, deactivate: false },
      roles: { view: false, manage: false, assignPermissions: false },
      settings: { access: false, manage: false },
      analytics: { view: false, export: false },
    },
  },
};

export const ALL_ROLE_CONFIGS: Record<RoleCode, RoleConfig> = {
  ...PLATFORM_ROLE_CONFIGS,
  ...TENANT_ROLE_CONFIGS,
};

export function isPlatformRole(roleCode: string): roleCode is PlatformRoleCode {
  return roleCode in PLATFORM_ROLE_CONFIGS;
}

export function isTenantRole(roleCode: string): roleCode is TenantRoleCode {
  return roleCode in TENANT_ROLE_CONFIGS;
}

export function getRoleConfig(roleCode: string): RoleConfig | null {
  if (isPlatformRole(roleCode)) {
    return PLATFORM_ROLE_CONFIGS[roleCode];
  }
  if (isTenantRole(roleCode)) {
    return TENANT_ROLE_CONFIGS[roleCode];
  }
  return null;
}

export function getUserRoleConfig(roleCodes: string[]): RoleConfig | null {
  const priorityOrder: RoleCode[] = [
    'platform_owner',
    'platform_admin',
    'platform_support',
    'platform_accountant',
    'tenant_admin',
    'facility_manager',
    'maintenance_manager',
    'engineer',
    'supervisor',
    'technician',
    'reporter',
  ];

  for (const roleCode of priorityOrder) {
    if (roleCodes.includes(roleCode)) {
      return ALL_ROLE_CONFIGS[roleCode];
    }
  }

  return null;
}

export function hasModuleAccess(
  roleConfig: RoleConfig | null,
  module: keyof RoleConfig['modules'],
  action: string
): boolean {
  if (!roleConfig) return false;

  const moduleConfig = roleConfig.modules[module];
  if (!moduleConfig) return false;

  return (moduleConfig as Record<string, unknown>)[action] === true;
}

export function hasPlatformModuleAccess(
  roleConfig: RoleConfig | null,
  module: keyof NonNullable<RoleConfig['platformModules']>,
  action: string
): boolean {
  if (!roleConfig || !roleConfig.platformModules) return false;

  const moduleConfig = roleConfig.platformModules[module];
  if (!moduleConfig) return false;

  return (moduleConfig as Record<string, unknown>)[action] === true;
}

export function canViewSidebarItem(
  roleConfig: RoleConfig | null,
  itemKey: string
): boolean {
  if (!roleConfig) return false;

  const moduleMapping: Record<string, { module: keyof RoleConfig['modules']; action: string }> = {
    dashboard: { module: 'dashboard', action: 'executive' },
    facilities: { module: 'facilities', action: 'view' },
    assets: { module: 'assets', action: 'view' },
    inventory: { module: 'inventory', action: 'view' },
    workOrders: { module: 'workOrders', action: 'view' },
    maintenance: { module: 'maintenance', action: 'view' },
    calibration: { module: 'calibration', action: 'view' },
    contracts: { module: 'contracts', action: 'view' },
    sla: { module: 'sla', action: 'view' },
    costs: { module: 'costs', action: 'view' },
    operations: { module: 'operationsLog', action: 'view' },
    teams: { module: 'teams', action: 'view' },
    users: { module: 'users', action: 'view' },
    settings: { module: 'settings', action: 'access' },
    analytics: { module: 'analytics', action: 'view' },
  };

  const mapping = moduleMapping[itemKey];
  if (!mapping) return true;

  const moduleConfig = roleConfig.modules[mapping.module];
  if (!moduleConfig) return false;

  if (mapping.action === 'view' && 'view' in moduleConfig) {
    const viewValue = moduleConfig.view;
    if (typeof viewValue === 'string') {
      return viewValue !== 'none';
    }
    return viewValue === true;
  }

  return (moduleConfig as Record<string, unknown>)[mapping.action] === true;
}

export function canViewPlatformSidebarItem(
  roleConfig: RoleConfig | null,
  itemKey: string
): boolean {
  if (!roleConfig || !roleConfig.platformModules) return false;

  const moduleMapping: Record<string, { module: keyof NonNullable<RoleConfig['platformModules']>; action: string }> = {
    tenants: { module: 'tenants', action: 'view' },
    subscriptions: { module: 'subscriptions', action: 'view' },
    plans: { module: 'plans', action: 'view' },
    invoices: { module: 'invoices', action: 'view' },
    payments: { module: 'payments', action: 'view' },
    financials: { module: 'financials', action: 'view' },
    auditLogs: { module: 'auditLogs', action: 'view' },
    platformSettings: { module: 'platformSettings', action: 'view' },
  };

  const mapping = moduleMapping[itemKey];
  if (!mapping) return true;

  const moduleConfig = roleConfig.platformModules[mapping.module];
  if (!moduleConfig) return false;

  return (moduleConfig as Record<string, unknown>)[mapping.action] === true;
}
