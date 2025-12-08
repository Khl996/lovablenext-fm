import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, Bell } from 'lucide-react';

export const UserMenu = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { signOut } = useAuth();
  const { profile, roles } = useCurrentUser();
  const isArabic = language === 'ar';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplay = () => {
    if (!roles || roles.length === 0) return '';
    
    const roleNames: Record<string, { ar: string; en: string }> = {
      global_admin: { ar: 'مدير النظام', en: 'Global Admin' },
      hospital_admin: { ar: 'مدير المستشفى', en: 'Hospital Admin' },
      facility_manager: { ar: 'مدير المرافق', en: 'Facility Manager' },
      maintenance_manager: { ar: 'مدير الصيانة', en: 'Maintenance Manager' },
      engineer: { ar: 'مهندس', en: 'Engineer' },
      supervisor: { ar: 'مشرف', en: 'Supervisor' },
      technician: { ar: 'فني', en: 'Technician' },
      reporter: { ar: 'مُبلّغ', en: 'Reporter' },
    };

    const firstRole = roles[0];
    const roleKey = typeof firstRole === 'object' ? firstRole.role : firstRole;
    const roleInfo = roleNames[roleKey] || { ar: roleKey, en: roleKey };
    return isArabic ? roleInfo.ar : roleInfo.en;
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 p-1 rounded-md hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url || ''} />
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            {getInitials(profile?.full_name || 'U')}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col items-start text-sm">
          <span className="font-medium leading-none">
            {profile?.full_name || (isArabic ? 'المستخدم' : 'User')}
          </span>
          <span className="text-xs text-muted-foreground leading-none mt-0.5">
            {getRoleDisplay()}
          </span>
        </div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align={isArabic ? 'start' : 'end'} className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">
              {profile?.full_name || (isArabic ? 'المستخدم' : 'User')}
            </p>
            <p className="text-xs text-muted-foreground">
              {profile?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
          <User className="h-4 w-4 me-2" />
          {isArabic ? 'الملف الشخصي' : 'Profile'}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => navigate('/notification-settings')} className="cursor-pointer">
          <Bell className="h-4 w-4 me-2" />
          {isArabic ? 'إعدادات الإشعارات' : 'Notification Settings'}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 me-2" />
          {isArabic ? 'تسجيل الخروج' : 'Logout'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
