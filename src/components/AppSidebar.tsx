import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useTenant } from '@/contexts/TenantContext';
import { useTenantModules } from '@/hooks/useTenantModules';
import {
  getRoleConfig,
  canViewSidebarItem,
  canViewPlatformSidebarItem,
  isPlatformRole,
} from '@/lib/rolePermissions';
import {
  Building2,
  Users,
  Package,
  ClipboardList,
  Wrench,
  BarChart3,
  Settings,
  LayoutDashboard,
  ShieldCheck,
  Download,
  UsersRound,
  History,
  GitBranch,
  Award,
  Database,
  DollarSign,
  FileSignature,
  Timer,
  Gauge,
  Crown,
  Building,
  CreditCard,
  Receipt,
  Puzzle,
  PieChart,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';

interface SidebarItem {
  key: string;
  title: string;
  titleAr: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionModule?: string;
}

const mainItems: SidebarItem[] = [
  { key: 'dashboard', title: 'Dashboard', titleAr: 'لوحة التحكم', url: '/dashboard', icon: LayoutDashboard },
  { key: 'facilities', title: 'Facilities', titleAr: 'المرافق', url: '/facilities', icon: Building2, permissionModule: 'facilities' },
  { key: 'assets', title: 'Assets', titleAr: 'الأصول', url: '/admin/assets', icon: Package, permissionModule: 'assets' },
  { key: 'inventory', title: 'Inventory', titleAr: 'المخزون', url: '/admin/inventory', icon: Database, permissionModule: 'inventory' },
  { key: 'workOrders', title: 'Work Orders', titleAr: 'أوامر العمل', url: '/admin/work-orders', icon: ClipboardList, permissionModule: 'workOrders' },
  { key: 'maintenance', title: 'Maintenance', titleAr: 'الصيانة', url: '/maintenance', icon: Wrench, permissionModule: 'maintenance' },
  { key: 'calibration', title: 'Calibration', titleAr: 'المعايرة', url: '/admin/calibration', icon: Gauge, permissionModule: 'calibration' },
  { key: 'contracts', title: 'Contracts', titleAr: 'العقود', url: '/admin/contracts', icon: FileSignature, permissionModule: 'contracts' },
  { key: 'sla', title: 'SLA', titleAr: 'اتفاقيات الخدمة', url: '/admin/sla', icon: Timer, permissionModule: 'sla' },
  { key: 'costs', title: 'Costs', titleAr: 'التكاليف', url: '/admin/costs', icon: DollarSign, permissionModule: 'costs' },
  { key: 'operations', title: 'Operations Log', titleAr: 'سجل العمليات', url: '/operations-log', icon: History, permissionModule: 'operationsLog' },
  { key: 'teams', title: 'Teams', titleAr: 'الفرق', url: '/admin/teams', icon: UsersRound, permissionModule: 'teams' },
  { key: 'subscription', title: 'My Subscription', titleAr: 'اشتراكي', url: '/subscription', icon: CreditCard },
  { key: 'modules', title: 'Modules', titleAr: 'الوحدات', url: '/modules', icon: Puzzle },
  { key: 'settings', title: 'Settings', titleAr: 'الإعدادات', url: '/settings', icon: Settings, permissionModule: 'settings' },
];

const adminItems: SidebarItem[] = [
  { key: 'systemStats', title: 'System Stats', titleAr: 'إحصائيات النظام', url: '/admin/system-stats', icon: BarChart3, permissionModule: 'analytics' },
  { key: 'organizations', title: 'Organizations', titleAr: 'المؤسسات', url: '/admin/hospitals', icon: Building },
  { key: 'companies', title: 'Companies', titleAr: 'الشركات', url: '/admin/companies', icon: Building2 },
  { key: 'users', title: 'Users', titleAr: 'المستخدمين', url: '/admin/users', icon: Users, permissionModule: 'users' },
  { key: 'rolePermissions', title: 'Role Permissions', titleAr: 'صلاحيات الأدوار', url: '/admin/role-permissions', icon: ShieldCheck, permissionModule: 'roles' },
  { key: 'facilityLocations', title: 'Locations', titleAr: 'مواقع المرافق', url: '/admin/locations', icon: Building2 },
  { key: 'issueTypes', title: 'Issue Types', titleAr: 'أنواع البلاغات', url: '/admin/issue-types', icon: GitBranch },
  { key: 'specializations', title: 'Specializations', titleAr: 'التخصصات الفنية', url: '/admin/specializations', icon: Award },
  { key: 'lookupTables', title: 'Lookup Tables', titleAr: 'الجداول المرجعية', url: '/admin/lookup-tables', icon: Database },
];

const platformItems: SidebarItem[] = [
  { key: 'platformDashboard', title: 'Platform Dashboard', titleAr: 'لوحة تحكم المنصة', url: '/platform/dashboard', icon: Crown },
  { key: 'tenants', title: 'Tenants', titleAr: 'المستأجرون', url: '/platform/tenants', icon: Building },
  { key: 'plans', title: 'Subscription Plans', titleAr: 'خطط الاشتراك', url: '/platform/plans', icon: CreditCard },
  { key: 'invoices', title: 'Invoices', titleAr: 'الفواتير', url: '/platform/invoices', icon: Receipt },
  { key: 'financials', title: 'Financial Reports', titleAr: 'التقارير المالية', url: '/platform/financials', icon: PieChart },
];

export function AppSidebar({ side = 'left' }: { side?: 'left' | 'right' }) {
  const { state } = useSidebar();
  const { language, t } = useLanguage();
  const location = useLocation();
  const { permissions, loading, roleConfig, canAccessAdmin, hospitalId, profile } = useCurrentUser();
  const { isInstalled } = usePWAInstall();
  const { appName, appNameAr, logoUrl } = useSystemSettings();
  const { selectedTenant } = useTenant();

  const userRole = profile?.role || '';
  const isSuperAdmin = profile?.is_super_admin === true;
  const isPlatformUser = isPlatformRole(userRole) || isSuperAdmin;
  const isPlatformOwner = userRole === 'platform_owner' || isSuperAdmin;
  const isPlatformAdmin = isPlatformUser;

  const effectiveHospitalId = selectedTenant?.id || hospitalId;
  const { isModuleEnabled, loading: modulesLoading } = useTenantModules(effectiveHospitalId);

  const currentRoleConfig = getRoleConfig(userRole);
  const isCollapsed = state === 'collapsed';

  const canViewItem = (item: SidebarItem): boolean => {
    if (isPlatformOwner) return true;
    if (item.key === 'dashboard') return true;
    if (item.key === 'subscription' || item.key === 'modules') {
      return !isPlatformUser;
    }

    if (item.permissionModule) {
      if (!isModuleEnabled(item.permissionModule)) return false;

      if (currentRoleConfig) {
        return canViewSidebarItem(currentRoleConfig, item.key);
      }

      const viewPerm = `${item.permissionModule}.view`;
      const managePerm = `${item.permissionModule}.manage`;
      return permissions.hasPermission(viewPerm, effectiveHospitalId) ||
             permissions.hasPermission(managePerm, effectiveHospitalId);
    }

    return true;
  };

  const canViewAdminItem = (item: SidebarItem): boolean => {
    if (isPlatformOwner) return true;

    if (!canAccessAdmin && !currentRoleConfig?.canAccessAdmin) return false;

    if (item.permissionModule) {
      if (currentRoleConfig) {
        return canViewSidebarItem(currentRoleConfig, item.key);
      }

      const viewPerm = `${item.permissionModule}.view`;
      const managePerm = `${item.permissionModule}.manage`;
      return permissions.hasPermission(viewPerm, effectiveHospitalId) ||
             permissions.hasPermission(managePerm, effectiveHospitalId);
    }

    if (item.key === 'organizations') {
      return permissions.hasPermission('hospitals.view', effectiveHospitalId) ||
             permissions.hasPermission('hospitals.manage', effectiveHospitalId);
    }
    if (item.key === 'companies') {
      return permissions.hasPermission('companies.view', effectiveHospitalId) ||
             permissions.hasPermission('companies.manage', effectiveHospitalId);
    }
    if (item.key === 'facilityLocations') {
      return permissions.hasPermission('settings.locations', effectiveHospitalId);
    }
    if (item.key === 'issueTypes') {
      return permissions.hasPermission('settings.issue_types', effectiveHospitalId);
    }
    if (item.key === 'specializations') {
      return permissions.hasPermission('settings.specializations', effectiveHospitalId);
    }
    if (item.key === 'lookupTables') {
      return permissions.hasPermission('settings.lookup_tables', effectiveHospitalId);
    }

    return true;
  };

  const canViewPlatformItem = (item: SidebarItem): boolean => {
    if (!isPlatformAdmin) return false;
    if (isPlatformOwner) return true;

    if (currentRoleConfig?.platformModules) {
      return canViewPlatformSidebarItem(currentRoleConfig, item.key);
    }

    return permissions.hasPermission(`platform.view_${item.key}`) ||
           permissions.hasPermission(`platform.manage_${item.key}`);
  };

  const visibleMainItems = mainItems.filter(canViewItem);
  const visibleAdminItems = adminItems.filter(canViewAdminItem);
  const visiblePlatformItems = platformItems.filter(canViewPlatformItem);

  if (loading || modulesLoading) {
    return (
      <Sidebar side={side} className={isCollapsed ? 'w-14' : 'w-60'}>
        <SidebarContent>
          <div className="p-4 border-b">
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar side={side} className={isCollapsed ? 'w-14' : 'w-60'}>
      <SidebarContent>
        <div className="p-4 border-b flex items-center gap-3">
          <img
            src={logoUrl || '/mutqan-logo.png'}
            alt="App Logo"
            className="h-8 w-8 flex-shrink-0 object-contain"
          />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate">
                {language === 'ar' ? appNameAr : appName}
              </h2>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>
            {!isCollapsed && (language === 'ar' ? 'القائمة الرئيسية' : 'Main Menu')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && (
                        <span>{language === 'ar' ? item.titleAr : item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {!isCollapsed && (language === 'ar' ? 'الإدارة' : 'Administration')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-muted/50"
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && (
                          <span>{language === 'ar' ? item.titleAr : item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visiblePlatformItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {!isCollapsed && (language === 'ar' ? 'إدارة المنصة' : 'Platform')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visiblePlatformItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-muted/50"
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && (
                          <span>{language === 'ar' ? item.titleAr : item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isInstalled && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/install"
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <Download className="h-4 w-4" />
                      {!isCollapsed && (
                        <span>{language === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
