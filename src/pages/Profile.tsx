import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { User, Mail, Phone, Shield, Building2, Lock, Eye, EyeOff } from 'lucide-react';

const Profile = () => {
  const { language } = useLanguage();
  const { profile, roles } = useCurrentUser();
  const { user } = useAuth();

  // Fetch hospital name
  const { data: hospital } = useQuery({
    queryKey: ['hospital', profile?.hospital_id],
    queryFn: async () => {
      if (!profile?.hospital_id) return null;
      const { data, error } = await supabase
        .from('hospitals')
        .select('name, name_ar')
        .eq('id', profile.hospital_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.hospital_id,
  });
  const isArabic = language === 'ar';

  // Password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error(isArabic ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(isArabic ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error(isArabic ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success(isArabic ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || (isArabic ? 'حدث خطأ أثناء تغيير كلمة المرور' : 'Error changing password'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplay = () => {
    if (!roles || roles.length === 0) return isArabic ? 'لا يوجد دور' : 'No role';
    
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

    return roles.map(userRole => {
      const roleKey = typeof userRole === 'object' ? userRole.role : userRole;
      const roleInfo = roleNames[roleKey] || { ar: roleKey, en: roleKey };
      return isArabic ? roleInfo.ar : roleInfo.en;
    }).join(', ');
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {isArabic ? 'الملف الشخصي' : 'Profile'}
        </h1>
        <p className="text-muted-foreground">
          {isArabic ? 'معلوماتك الشخصية' : 'Your personal information'}
        </p>
      </div>

      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                {getInitials(profile?.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{profile?.full_name || (isArabic ? 'المستخدم' : 'User')}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Shield className="h-4 w-4" />
                {getRoleDisplay()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {isArabic ? 'الاسم الكامل' : 'Full Name'}
              </Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {isArabic ? (profile?.full_name_ar || profile?.full_name || '-') : (profile?.full_name || '-')}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {isArabic ? 'البريد الإلكتروني' : 'Email'}
              </Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {user?.email || '-'}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {isArabic ? 'رقم الهاتف' : 'Phone Number'}
              </Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {profile?.phone || (isArabic ? 'غير محدد' : 'Not specified')}
              </div>
            </div>

            {profile?.hospital_id && hospital && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {isArabic ? 'المستشفى' : 'Hospital'}
                </Label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {isArabic ? hospital.name_ar : hospital.name}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {isArabic ? 'تغيير كلمة المرور' : 'Change Password'}
          </CardTitle>
          <CardDescription>
            {isArabic ? 'قم بتحديث كلمة المرور الخاصة بك' : 'Update your password'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">
              {isArabic ? 'كلمة المرور الجديدة' : 'New Password'}
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={isArabic ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password'}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={isArabic ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
            />
          </div>

          <Button 
            onClick={handleChangePassword} 
            disabled={isChangingPassword || !newPassword || !confirmPassword}
            variant="secondary"
            className="gap-2"
          >
            <Lock className="h-4 w-4" />
            {isChangingPassword 
              ? (isArabic ? 'جاري التغيير...' : 'Changing...') 
              : (isArabic ? 'تغيير كلمة المرور' : 'Change Password')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
