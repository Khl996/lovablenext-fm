import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import {
  Building2,
  Users,
  Package,
  ClipboardList,
  Wrench,
  BarChart3,
  Settings,
  Hospital,
  LayoutDashboard,
  ShieldCheck,
  Download,
  FileText,
  UsersRound,
  History,
  GitBranch,
  Award,
  Database,
  DollarSign,
  FileSignature,
  Timer,
  Gauge,
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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';

const mainItems = [
  { title: 'dashboard', titleAr: 'لوحة التحكم', url: '/dashboard', icon: LayoutDashboard },
  { title: 'facilities', titleAr: 'المرافق', url: '/facilities', icon: Building2 },
  { title: 'assets', titleAr: 'الأصول', url: '/admin/assets', icon: Package },
  { title: 'inventory', titleAr: 'المخزون', url: '/admin/inventory', icon: Database },
  { title: 'workOrders', titleAr: 'أوامر العمل', url: '/admin/work-orders', icon: ClipboardList },
  { title: 'maintenance', titleAr: 'الصيانة', url: '/maintenance', icon: Wrench },
  { title: 'calibration', titleAr: 'المعايرة', url: '/admin/calibration', icon: Gauge },
  { title: 'contracts', titleAr: 'العقود', url: '/admin/contracts', icon: FileSignature },
  { title: 'sla', titleAr: 'اتفاقيات الخدمة', url: '/admin/sla', icon: Timer },
  { title: 'costs', titleAr: 'التكاليف', url: '/admin/costs', icon: DollarSign },
  { title: 'operations', titleAr: 'سجل العمليات', url: '/operations-log', icon: History },
  { title: 'teams', titleAr: 'الفرق', url: '/admin/teams', icon: UsersRound },
  { title: 'settings', titleAr: 'الإعدادات', url: '/settings', icon: Settings },
];

const adminItems = [
  { title: 'hospitals', titleAr: 'المستشفيات', url: '/admin/hospitals', icon: Hospital },
  { title: 'companies', titleAr: 'الشركات', url: '/admin/companies', icon: Building2 },
  { title: 'users', titleAr: 'المستخدمين', url: '/admin/users', icon: Users },
  { title: 'rolePermissions', titleAr: 'صلاحيات الأدوار', url: '/admin/role-permissions', icon: ShieldCheck },
  { title: 'facilityLocations', titleAr: 'مواقع المرافق', url: '/admin/locations', icon: Building2 },
  { title: 'issueTypes', titleAr: 'أنواع البلاغات', url: '/admin/issue-types', icon: GitBranch },
  { title: 'specializations', titleAr: 'التخصصات الفنية', url: '/admin/specializations', icon: Award },
  { title: 'lookupTables', titleAr: 'الجداول المرجعية', url: '/admin/lookup-tables', icon: Database },
];

export function AppSidebar({ side = 'left' }: { side?: 'left' | 'right' }) {
  const { state } = useSidebar();
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions, loading, roleConfig, canAccessAdmin, hospitalId, isGlobalAdmin, isHospitalAdmin } = useCurrentUser();
  const { isInstalled } = usePWAInstall();
  const { appName, appNameAr, logoUrl } = useSystemSettings();

  console.log('AppSidebar permissions debug', {
    allPermissions: permissions.allPermissions,
    loadingPermissions: permissions.loading,
    canAccessAdmin,
    roleConfig,
  });

  const isActive = (path: string) => location.pathname === path;
  const isCollapsed = state === 'collapsed';

  // Helper function to check if user has view OR manage permission
  const hasModuleAccess = (moduleName: string) => {
    return permissions.hasPermission(`${moduleName}.view`, hospitalId) || 
           permissions.hasPermission(`${moduleName}.manage`, hospitalId);
  };

  // Filter main items based on NEW DATABASE PERMISSIONS
  const visibleMainItems = mainItems.filter(item => {
    // Dashboard is visible to all authenticated users
    if (item.url === '/dashboard') return true;

    // Check database permissions for each module (view OR manage)
    if (item.url.includes('/facilities')) {
      return hasModuleAccess('facilities');
    }
    if (item.url.includes('/assets')) {
      return hasModuleAccess('assets');
    }
    if (item.url.includes('/inventory')) {
      return hasModuleAccess('inventory');
    }
    if (item.url.includes('/work-orders')) {
      // Work orders use OLD perfect system - check roleConfig
      return roleConfig && roleConfig.modules.workOrders.view !== 'own';
    }
    if (item.url.includes('/maintenance')) {
      return hasModuleAccess('maintenance');
    }
    if (item.url.includes('/calibration')) {
      return hasModuleAccess('calibration');
    }
    if (item.url.includes('/contracts')) {
      return hasModuleAccess('contracts');
    }
    if (item.url.includes('/sla')) {
      return hasModuleAccess('sla');
    }
    if (item.url.includes('/costs')) {
      return hasModuleAccess('costs');
    }
    if (item.url.includes('/teams')) {
      return hasModuleAccess('teams');
    }
    if (item.url.includes('/operations-log')) {
      return hasModuleAccess('operations_log');
    }
    if (item.url.includes('/settings')) {
      return permissions.hasPermission('settings.access', hospitalId);
    }

    // Default: show if no specific permission required
    return true;
  });

  // Filter admin items based on NEW SYSTEM
  const visibleAdminItems = canAccessAdmin
    ? adminItems.filter(item => {
        // Check specific permissions for admin items
        if (item.url.includes('/hospitals')) {
          return permissions.hasPermission('hospitals.view', hospitalId) || permissions.hasPermission('hospitals.manage', hospitalId);
        }
        if (item.url.includes('/companies')) {
          return permissions.hasPermission('companies.view', hospitalId) || permissions.hasPermission('companies.manage', hospitalId);
        }
        if (item.url.includes('/users')) {
          return permissions.hasPermission('users.manage', hospitalId) || permissions.hasPermission('users.view', hospitalId);
        }
        if (item.url.includes('/role-permissions')) {
          return permissions.hasPermission('settings.role_permissions', hospitalId);
        }
        if (item.url.includes('/locations')) {
          return permissions.hasPermission('settings.locations', hospitalId);
        }
        if (item.url.includes('/issue-types')) {
          return permissions.hasPermission('settings.issue_types', hospitalId);
        }
        if (item.url.includes('/specializations')) {
          return permissions.hasPermission('settings.specializations', hospitalId);
        }
        if (item.url.includes('/lookup-tables')) {
          return permissions.hasPermission('settings.lookup_tables', hospitalId);
        }
        return true;
      })
    : [];

  if (loading) {
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
        {/* Logo Header */}
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

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>{!isCollapsed && (language === 'ar' ? 'القائمة الرئيسية' : 'Main Menu')}</SidebarGroupLabel>
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
                      {!isCollapsed && <span>{language === 'ar' ? item.titleAr : t(item.title as any)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation */}
        {visibleAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{!isCollapsed && (language === 'ar' ? 'الإدارة' : 'Administration')}</SidebarGroupLabel>
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
                        {!isCollapsed && <span>{language === 'ar' ? item.titleAr : t(item.title as any)}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Install App Link */}
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
                      {!isCollapsed && <span>{language === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</span>}
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
