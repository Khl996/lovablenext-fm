import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Upload, Loader2, Image as ImageIcon, RefreshCw, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  setting_type: string;
  description: string | null;
  description_ar: string | null;
}

export default function Settings() {
  const { language } = useLanguage();
  const { permissions, hospitalId, loading } = useCurrentUser();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasAccess = permissions.hasPermission('settings.access', hospitalId);

  const [appName, setAppName] = useState('Mutqan FM');
  const [appNameAr, setAppNameAr] = useState('متقن FM');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Email gateway settings
  const [emailFromAddress, setEmailFromAddress] = useState('noreply@facility-management.space');
  const [emailFromName, setEmailFromName] = useState('نظام الصيانة');
  const [emailEnabled, setEmailEnabled] = useState(true);

  // Fetch settings from database
  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');
      
      if (error) throw error;
      return data as SystemSetting[];
    },
    enabled: hasAccess,
  });

  // Update local state when settings load
  useEffect(() => {
    if (settings) {
      const nameEn = settings.find(s => s.setting_key === 'app_name');
      const nameAr = settings.find(s => s.setting_key === 'app_name_ar');
      const logo = settings.find(s => s.setting_key === 'app_logo_url');
      const fromAddress = settings.find(s => s.setting_key === 'email_from_address');
      const fromName = settings.find(s => s.setting_key === 'email_from_name');
      const enabled = settings.find(s => s.setting_key === 'email_enabled');
      
      if (nameEn?.setting_value) setAppName(nameEn.setting_value);
      if (nameAr?.setting_value) setAppNameAr(nameAr.setting_value);
      if (logo?.setting_value) setLogoUrl(logo.setting_value);
      if (fromAddress?.setting_value) setEmailFromAddress(fromAddress.setting_value);
      if (fromName?.setting_value) setEmailFromName(fromName.setting_value);
      if (enabled?.setting_value !== undefined) setEmailEnabled(enabled.setting_value === 'true');
    }
  }, [settings]);

  // Update setting mutation
  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | null }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq('setting_key', key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'ar' ? 'يرجى اختيار ملف صورة' : 'Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(language === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 2 ميجا)' : 'File size too large (max 2MB)');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `app-logo-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('system-branding')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('system-branding')
        .getPublicUrl(filePath);

      // Save URL to settings
      await updateSetting.mutateAsync({ key: 'app_logo_url', value: publicUrl });
      setLogoUrl(publicUrl);

      toast.success(language === 'ar' ? 'تم رفع الشعار بنجاح' : 'Logo uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(language === 'ar' ? 'فشل رفع الشعار' : 'Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle save branding
  const handleSaveBranding = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: 'app_name', value: appName }),
        updateSetting.mutateAsync({ key: 'app_name_ar', value: appNameAr }),
      ]);

      toast.success(language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(language === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    }
  };

  // Handle save email settings
  const handleSaveEmailSettings = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: 'email_from_address', value: emailFromAddress }),
        updateSetting.mutateAsync({ key: 'email_from_name', value: emailFromName }),
        updateSetting.mutateAsync({ key: 'email_enabled', value: emailEnabled.toString() }),
      ]);

      toast.success(language === 'ar' ? 'تم حفظ إعدادات البريد بنجاح' : 'Email settings saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(language === 'ar' ? 'فشل حفظ إعدادات البريد' : 'Failed to save email settings');
    }
  };

  // Handle reset logo
  const handleResetLogo = async () => {
    try {
      await updateSetting.mutateAsync({ key: 'app_logo_url', value: null });
      setLogoUrl(null);
      toast.success(language === 'ar' ? 'تم إعادة الشعار للافتراضي' : 'Logo reset to default');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل إعادة الشعار' : 'Failed to reset logo');
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {language === 'ar' ? 'ليس لديك صلاحية الوصول لهذه الصفحة' : 'You do not have access to this page'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ar' ? 'الإعدادات' : 'Settings'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'إدارة إعدادات النظام والهوية البصرية' 
              : 'Manage system settings and branding'}
          </p>
        </div>
      </div>

      {/* App Name & Branding Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {language === 'ar' ? 'اسم النظام والشعار' : 'App Name & Branding'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? 'تعديل اسم النظام والشعار الذي يظهر في صفحة الدخول والشريط الجانبي' 
              : 'Change the system name and logo displayed on login page and sidebar'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* App Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اسم النظام (إنجليزي)' : 'System Name (English)'}</Label>
              <Input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Mutqan FM"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اسم النظام (عربي)' : 'System Name (Arabic)'}</Label>
              <Input
                value={appNameAr}
                onChange={(e) => setAppNameAr(e.target.value)}
                placeholder="متقن FM"
                dir="rtl"
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-4">
            <Label>{language === 'ar' ? 'شعار النظام' : 'System Logo'}</Label>
            
            <div className="flex items-start gap-6">
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="App Logo" 
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <img 
                      src="/mutqan-logo.png" 
                      alt="Default Logo" 
                      className="w-full h-full object-contain p-2 opacity-50"
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {logoUrl 
                    ? (language === 'ar' ? 'الشعار الحالي' : 'Current Logo')
                    : (language === 'ar' ? 'الشعار الافتراضي' : 'Default Logo')
                  }
                </p>
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full md:w-auto"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {language === 'ar' ? 'رفع شعار جديد' : 'Upload New Logo'}
                </Button>

                {logoUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetLogo}
                    className="text-muted-foreground"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'إعادة للافتراضي' : 'Reset to Default'}
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  {language === 'ar' 
                    ? 'يُفضل استخدام صورة مربعة بحجم 512×512 بكسل. الحد الأقصى 2 ميجابايت.' 
                    : 'Recommended: Square image, 512×512px. Max size: 2MB.'}
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleSaveBranding}
              disabled={updateSetting.isPending}
            >
              {updateSetting.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Gateway Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {language === 'ar' ? 'بوابة البريد الإلكتروني' : 'Email Gateway'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? 'إعدادات إرسال إشعارات البريد الإلكتروني' 
              : 'Configure email notification settings'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Enabled Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-base">
                {language === 'ar' ? 'تفعيل إشعارات البريد' : 'Enable Email Notifications'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'تفعيل أو إيقاف إرسال الإشعارات عبر البريد الإلكتروني' 
                  : 'Turn email notifications on or off'}
              </p>
            </div>
            <Switch
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>

          {/* Sender Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اسم المرسل' : 'Sender Name'}</Label>
              <Input
                value={emailFromName}
                onChange={(e) => setEmailFromName(e.target.value)}
                placeholder={language === 'ar' ? 'نظام الصيانة' : 'Maintenance System'}
                disabled={!emailEnabled}
              />
              <p className="text-xs text-muted-foreground">
                {language === 'ar' 
                  ? 'الاسم الذي يظهر في صندوق الوارد للمستلم' 
                  : 'Name that appears in recipient\'s inbox'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'عنوان البريد المرسل' : 'Sender Email Address'}</Label>
              <Input
                type="email"
                value={emailFromAddress}
                onChange={(e) => setEmailFromAddress(e.target.value)}
                placeholder="noreply@example.com"
                disabled={!emailEnabled}
              />
              <p className="text-xs text-muted-foreground">
                {language === 'ar' 
                  ? 'يجب أن يكون نطاقاً موثقاً في خدمة البريد' 
                  : 'Must be a verified domain in your email service'}
              </p>
            </div>
          </div>

          {/* Provider Info */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              <strong>{language === 'ar' ? 'مزود الخدمة:' : 'Provider:'}</strong>{' '}
              Resend API
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar' 
                ? 'لتغيير مفتاح API أو مزود الخدمة، تواصل مع المطور' 
                : 'To change API key or provider, contact the developer'}
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleSaveEmailSettings}
              disabled={updateSetting.isPending}
            >
              {updateSetting.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {language === 'ar' ? 'حفظ إعدادات البريد' : 'Save Email Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
