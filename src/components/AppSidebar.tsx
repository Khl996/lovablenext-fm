import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
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
  { title: 'assets', titleAr: 'الأصول', url: '/assets', icon: Package },
  { title: 'workOrders', titleAr: 'أوامر العمل', url: '/work-orders', icon: ClipboardList },
  { title: 'operations', titleAr: 'سجل العمليات', url: '/operations', icon: Wrench },
  { title: 'maintenance', titleAr: 'الصيانة', url: '/maintenance', icon: BarChart3 },
];

const adminItems = [
  { title: 'hospitals', titleAr: 'المستشفيات', url: '/admin/hospitals', icon: Hospital },
  { title: 'users', titleAr: 'المستخدمين', url: '/admin/users', icon: Users },
  { title: 'settings', titleAr: 'الإعدادات', url: '/admin/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar className={isCollapsed ? 'w-14' : 'w-60'}>
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
              {mainItems.map((item) => (
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
        <SidebarGroup>
          <SidebarGroupLabel>{!isCollapsed && (language === 'ar' ? 'الإدارة' : 'Administration')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
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
      </SidebarContent>
    </Sidebar>
  );
}
