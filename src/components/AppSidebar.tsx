import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePWAInstall } from '@/hooks/usePWAInstall';
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
  Shield,
  Download,
  FileText,
  UsersRound,
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
  { title: 'assets', titleAr: 'الأصول', url: '/admin/assets', icon: Package, permission: 'view_assets' },
  { title: 'workOrders', titleAr: 'أوامر العمل', url: '/admin/work-orders', icon: ClipboardList },
  { title: 'teams', titleAr: 'الفرق', url: '/admin/teams', icon: UsersRound, permission: 'view_teams' },
  { title: 'operations', titleAr: 'سجل العمليات', url: '/operations-log', icon: FileText, permission: 'view_operations_log' },
  { title: 'maintenance', titleAr: 'الصيانة', url: '/maintenance', icon: BarChart3 },
];

const adminItems = [
  { title: 'hospitals', titleAr: 'المستشفيات', url: '/admin/hospitals', icon: Hospital, permission: 'manage_hospitals' },
  { title: 'users', titleAr: 'المستخدمين', url: '/admin/users', icon: Users, permission: 'manage_users' },
  { title: 'rolePermissions', titleAr: 'صلاحيات الأدوار', url: '/admin/permissions', icon: Shield, permission: 'manage_users' },
  { title: 'facilityLocations', titleAr: 'مواقع المرافق', url: '/admin/locations', icon: Building2, permission: 'manage_locations' },
  { title: 'settings', titleAr: 'الإعدادات', url: '/settings', icon: Settings },
];

export function AppSidebar({ side = 'left' }: { side?: 'left' | 'right' }) {
  const { state } = useSidebar();
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions, loading } = useCurrentUser();
  const { isInstalled } = usePWAInstall();

  const isActive = (path: string) => location.pathname === path;
  const isCollapsed = state === 'collapsed';

  // Filter main items based on permissions
  const visibleMainItems = mainItems.filter(item => {
    if (item.permission) {
      return permissions.hasPermission(item.permission as any);
    }
    return true;
  });

  // Filter admin items based on permissions
  const visibleAdminItems = adminItems.filter(item => {
    if (item.permission) {
      return permissions.hasPermission(item.permission as any);
    }
    return true; // items without permission (like settings) are visible to all
  });

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
        {/* Logo */}
        <div className="p-4 border-b flex items-center gap-3">
          <div className="bg-primary/5 p-2 rounded-lg border border-border">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate">
                {language === 'ar' ? 'نظام إدارة المرافق' : 'FMS'}
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
