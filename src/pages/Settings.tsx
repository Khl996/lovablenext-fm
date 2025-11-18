import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Building2, Palette, Bell, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { language } = useLanguage();
  const { permissions, loading, isHospitalAdmin, isFacilityManager, isGlobalAdmin } = useCurrentUser();
  const navigate = useNavigate();

  // Check if user has permission to access settings
  useEffect(() => {
    // Don't check permissions while still loading
    if (loading || permissions.loading) return;
    
    if (!isHospitalAdmin && !isFacilityManager && !isGlobalAdmin) {
      toast.error(
        language === 'ar'
          ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة'
          : 'You do not have permission to access this page'
      );
      navigate('/dashboard');
    }
  }, [isHospitalAdmin, isFacilityManager, isGlobalAdmin, loading, navigate, language]);

  const [generalSettings, setGeneralSettings] = useState({
    systemName: 'FMS',
    systemNameAr: 'نظام إدارة المرافق',
    language: 'ar',
    timezone: 'Asia/Riyadh',
    codePrefix: 'FMS',
  });

  const [facilityInfo, setFacilityInfo] = useState({
    facilityName: '',
    facilityNameAr: '',
    facilityType: 'hospital',
    manager: '',
    operationalHours: '24/7',
  });

  const [brandingSettings, setBrandingSettings] = useState({
    primaryColor: '#0EA5E9',
    logoUrl: '',
    headerTemplate: 'default',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    workOrderAlerts: true,
    maintenanceAlerts: true,
    criticalAlerts: true,
  });

  const handleSaveGeneral = () => {
    toast.success(
      language === 'ar' 
        ? 'تم حفظ الإعدادات العامة بنجاح' 
        : 'General settings saved successfully'
    );
  };

  const handleSaveFacility = () => {
    toast.success(
      language === 'ar' 
        ? 'تم حفظ بيانات المنشأة بنجاح' 
        : 'Facility information saved successfully'
    );
  };

  const handleSaveBranding = () => {
    toast.success(
      language === 'ar' 
        ? 'تم حفظ إعدادات الهوية البصرية بنجاح' 
        : 'Branding settings saved successfully'
    );
  };

  const handleSaveNotifications = () => {
    toast.success(
      language === 'ar' 
        ? 'تم حفظ إعدادات الإشعارات بنجاح' 
        : 'Notification settings saved successfully'
    );
  };

  const handleResetDefaults = () => {
    if (confirm(language === 'ar' 
      ? 'هل أنت متأكد من استرجاع الإعدادات الافتراضية؟' 
      : 'Are you sure you want to reset to default settings?'
    )) {
      toast.success(
        language === 'ar' 
          ? 'تم استرجاع الإعدادات الافتراضية' 
          : 'Default settings restored'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <img src="/mutqan-logo.png" alt="Mutqan Logo" className="h-10 w-10" />
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            {language === 'ar' ? 'الإعدادات' : 'Settings'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'إدارة إعدادات نظام متقن' 
              : 'Manage Mutqan system settings'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="general">
            <SettingsIcon className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'عام' : 'General'}
          </TabsTrigger>
          <TabsTrigger value="facility">
            <Building2 className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'المنشأة' : 'Facility'}
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'الهوية' : 'Branding'}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'الإشعارات' : 'Notifications'}
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'الإعدادات العامة' : 'General Settings'}</CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'إعدادات النظام الأساسية واللغة والمنطقة الزمنية' 
                  : 'Basic system settings, language, and timezone'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اسم النظام (إنجليزي)' : 'System Name (English)'}</Label>
                  <Input
                    value={generalSettings.systemName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, systemName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اسم النظام (عربي)' : 'System Name (Arabic)'}</Label>
                  <Input
                    value={generalSettings.systemNameAr}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, systemNameAr: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اللغة الافتراضية' : 'Default Language'}</Label>
                  <Select 
                    value={generalSettings.language}
                    onValueChange={(value) => setGeneralSettings({ ...generalSettings, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">{language === 'ar' ? 'العربية' : 'Arabic'}</SelectItem>
                      <SelectItem value="en">{language === 'ar' ? 'الإنجليزية' : 'English'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'المنطقة الزمنية' : 'Timezone'}</Label>
                  <Select 
                    value={generalSettings.timezone}
                    onValueChange={(value) => setGeneralSettings({ ...generalSettings, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Riyadh">Riyadh (GMT+3)</SelectItem>
                      <SelectItem value="Asia/Dubai">Dubai (GMT+4)</SelectItem>
                      <SelectItem value="Africa/Cairo">Cairo (GMT+2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'بادئة الترقيم' : 'Code Prefix'}</Label>
                <Input
                  value={generalSettings.codePrefix}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, codePrefix: e.target.value })}
                  placeholder="FMS"
                />
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' 
                    ? 'سيتم استخدام هذه البادئة في ترقيم الأصول وأوامر العمل' 
                    : 'This prefix will be used for asset and work order codes'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveGeneral}>
                  {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Facility Info */}
        <TabsContent value="facility">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'بيانات المنشأة' : 'Facility Information'}</CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'معلومات المنشأة وساعات التشغيل' 
                  : 'Facility details and operational information'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اسم المنشأة (إنجليزي)' : 'Facility Name (English)'}</Label>
                  <Input
                    value={facilityInfo.facilityName}
                    onChange={(e) => setFacilityInfo({ ...facilityInfo, facilityName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اسم المنشأة (عربي)' : 'Facility Name (Arabic)'}</Label>
                  <Input
                    value={facilityInfo.facilityNameAr}
                    onChange={(e) => setFacilityInfo({ ...facilityInfo, facilityNameAr: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'نوع المنشأة' : 'Facility Type'}</Label>
                  <Select 
                    value={facilityInfo.facilityType}
                    onValueChange={(value) => setFacilityInfo({ ...facilityInfo, facilityType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hospital">{language === 'ar' ? 'مستشفى' : 'Hospital'}</SelectItem>
                      <SelectItem value="clinic">{language === 'ar' ? 'عيادة' : 'Clinic'}</SelectItem>
                      <SelectItem value="medical_center">{language === 'ar' ? 'مركز طبي' : 'Medical Center'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'المدير' : 'Manager'}</Label>
                  <Input
                    value={facilityInfo.manager}
                    onChange={(e) => setFacilityInfo({ ...facilityInfo, manager: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'ساعات التشغيل' : 'Operational Hours'}</Label>
                <Input
                  value={facilityInfo.operationalHours}
                  onChange={(e) => setFacilityInfo({ ...facilityInfo, operationalHours: e.target.value })}
                />
              </div>

              <Button onClick={handleSaveFacility}>
                {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'الهوية البصرية' : 'Visual Branding'}</CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'الشعارات والألوان وقوالب التقارير' 
                  : 'Logos, colors, and report templates'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اللون الأساسي' : 'Primary Color'}</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={brandingSettings.primaryColor}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, primaryColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={brandingSettings.primaryColor}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, primaryColor: e.target.value })}
                    placeholder="#0EA5E9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'رابط الشعار' : 'Logo URL'}</Label>
                <Input
                  value={brandingSettings.logoUrl}
                  onChange={(e) => setBrandingSettings({ ...brandingSettings, logoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'قالب الترويسة' : 'Header Template'}</Label>
                <Select 
                  value={brandingSettings.headerTemplate}
                  onValueChange={(value) => setBrandingSettings({ ...brandingSettings, headerTemplate: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{language === 'ar' ? 'افتراضي' : 'Default'}</SelectItem>
                    <SelectItem value="minimal">{language === 'ar' ? 'بسيط' : 'Minimal'}</SelectItem>
                    <SelectItem value="detailed">{language === 'ar' ? 'مفصل' : 'Detailed'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveBranding}>
                {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}</CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'إدارة أنواع الإشعارات وقنوات الإرسال' 
                  : 'Manage notification types and delivery channels'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ar' ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}</Label>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'تلقي الإشعارات عبر البريد الإلكتروني' 
                      : 'Receive notifications via email'}
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ar' ? 'الإشعارات الفورية' : 'Push Notifications'}</Label>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'تلقي إشعارات فورية على الجهاز' 
                      : 'Receive instant push notifications'}
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.pushNotifications}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({ ...notificationSettings, pushNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ar' ? 'تنبيهات أوامر العمل' : 'Work Order Alerts'}</Label>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'إشعارات عند إنشاء أو تحديث أوامر العمل' 
                      : 'Alerts for work order creation and updates'}
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.workOrderAlerts}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({ ...notificationSettings, workOrderAlerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ar' ? 'تنبيهات الصيانة' : 'Maintenance Alerts'}</Label>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'إشعارات عند اقتراب مواعيد الصيانة' 
                      : 'Alerts for upcoming maintenance'}
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.maintenanceAlerts}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({ ...notificationSettings, maintenanceAlerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === 'ar' ? 'التنبيهات الحرجة' : 'Critical Alerts'}</Label>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'إشعارات عاجلة للمهام الحرجة' 
                      : 'Urgent alerts for critical tasks'}
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.criticalAlerts}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({ ...notificationSettings, criticalAlerts: checked })
                  }
                />
              </div>

              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => navigate('/notification-settings')}
                >
                  <Bell className="h-4 w-4" />
                  {language === 'ar' ? 'إعدادات التنبيهات المتقدمة' : 'Advanced Notification Settings'}
                </Button>
              </div>

              <Button onClick={handleSaveNotifications}>
                {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Management Links */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'روابط سريعة للإدارة' : 'Quick Management Links'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            variant="outline" 
            className="justify-start gap-2"
            onClick={() => navigate('/admin/users')}
          >
            <Users className="h-4 w-4" />
            {language === 'ar' ? 'إدارة المستخدمين' : 'Manage Users'}
          </Button>
          <Button 
            variant="outline" 
            className="justify-start gap-2"
            onClick={() => navigate('/admin/permissions')}
          >
            <Users className="h-4 w-4" />
            {language === 'ar' ? 'الأدوار والصلاحيات' : 'Roles & Permissions'}
          </Button>
          <Button 
            variant="outline" 
            className="justify-start gap-2"
            onClick={() => navigate('/admin/hospitals')}
          >
            <Building2 className="h-4 w-4" />
            {language === 'ar' ? 'إدارة المستشفيات' : 'Manage Hospitals'}
          </Button>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button variant="destructive" onClick={handleResetDefaults}>
          {language === 'ar' ? 'استرجاع الإعدادات الافتراضية' : 'Reset to Defaults'}
        </Button>
      </div>
    </div>
  );
}
