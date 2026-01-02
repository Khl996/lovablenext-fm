import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ClipboardList,
  Package,
  Building2,
  Wrench,
  Users,
  FileText,
  Settings,
  BarChart3,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface Module {
  code: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  icon: any;
  category: string;
  isCore: boolean;
}

const AVAILABLE_MODULES: Module[] = [
  {
    code: 'work_orders',
    name: 'Work Orders',
    name_ar: 'أوامر العمل',
    description: 'Manage work orders and maintenance requests',
    description_ar: 'إدارة أوامر العمل وطلبات الصيانة',
    icon: ClipboardList,
    category: 'core',
    isCore: true
  },
  {
    code: 'assets',
    name: 'Assets Management',
    name_ar: 'إدارة الأصول',
    description: 'Track and manage facility assets',
    description_ar: 'تتبع وإدارة أصول المنشأة',
    icon: Package,
    category: 'core',
    isCore: true
  },
  {
    code: 'locations',
    name: 'Locations & Facilities',
    name_ar: 'المواقع والمرافق',
    description: 'Manage buildings, floors, and rooms',
    description_ar: 'إدارة المباني والطوابق والغرف',
    icon: Building2,
    category: 'core',
    isCore: true
  },
  {
    code: 'maintenance',
    name: 'Preventive Maintenance',
    name_ar: 'الصيانة الوقائية',
    description: 'Schedule and track preventive maintenance',
    description_ar: 'جدولة وتتبع الصيانة الوقائية',
    icon: Wrench,
    category: 'core',
    isCore: true
  },
  {
    code: 'teams',
    name: 'Teams Management',
    name_ar: 'إدارة الفرق',
    description: 'Organize maintenance teams and assignments',
    description_ar: 'تنظيم فرق الصيانة والتعيينات',
    icon: Users,
    category: 'advanced',
    isCore: false
  },
  {
    code: 'inventory',
    name: 'Inventory Management',
    name_ar: 'إدارة المخزون',
    description: 'Track spare parts and materials',
    description_ar: 'تتبع قطع الغيار والمواد',
    icon: Package,
    category: 'advanced',
    isCore: false
  },
  {
    code: 'operations_log',
    name: 'Operations Log',
    name_ar: 'سجل العمليات',
    description: 'Detailed log of all maintenance operations',
    description_ar: 'سجل تفصيلي لجميع عمليات الصيانة',
    icon: FileText,
    category: 'advanced',
    isCore: false
  },
  {
    code: 'contracts',
    name: 'Contracts Management',
    name_ar: 'إدارة العقود',
    description: 'Manage vendor and service contracts',
    description_ar: 'إدارة عقود الموردين والخدمات',
    icon: FileText,
    category: 'advanced',
    isCore: false
  },
  {
    code: 'calibration',
    name: 'Calibration Management',
    name_ar: 'إدارة المعايرة',
    description: 'Track equipment calibration schedules',
    description_ar: 'تتبع جداول معايرة المعدات',
    icon: Settings,
    category: 'advanced',
    isCore: false
  },
  {
    code: 'analytics',
    name: 'Advanced Analytics',
    name_ar: 'التحليلات المتقدمة',
    description: 'Detailed reports and analytics dashboards',
    description_ar: 'تقارير ولوحات تحليلات تفصيلية',
    icon: BarChart3,
    category: 'premium',
    isCore: false
  }
];

export default function ModulesManagement() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) return;

      setTenantId(profile.tenant_id);

      const { data: tenant } = await supabase
        .from('tenants')
        .select('enabled_modules')
        .eq('id', profile.tenant_id)
        .single();

      if (tenant?.enabled_modules) {
        setEnabledModules(tenant.enabled_modules as string[]);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error(language === 'ar' ? 'فشل تحميل الوحدات' : 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (moduleCode: string, isCore: boolean) => {
    if (isCore) {
      toast.error(language === 'ar' ? 'لا يمكن تعطيل الوحدات الأساسية' : 'Cannot disable core modules');
      return;
    }

    if (!tenantId) return;

    try {
      const newEnabledModules = enabledModules.includes(moduleCode)
        ? enabledModules.filter(m => m !== moduleCode)
        : [...enabledModules, moduleCode];

      const { error } = await supabase
        .from('tenants')
        .update({
          enabled_modules: newEnabledModules,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (error) throw error;

      setEnabledModules(newEnabledModules);

      toast.success(
        language === 'ar'
          ? `تم ${enabledModules.includes(moduleCode) ? 'تعطيل' : 'تفعيل'} الوحدة بنجاح`
          : `Module ${enabledModules.includes(moduleCode) ? 'disabled' : 'enabled'} successfully`
      );
    } catch (error) {
      console.error('Error toggling module:', error);
      toast.error(language === 'ar' ? 'فشل تحديث الوحدة' : 'Failed to update module');
    }
  };

  const groupedModules = {
    core: AVAILABLE_MODULES.filter(m => m.category === 'core'),
    advanced: AVAILABLE_MODULES.filter(m => m.category === 'advanced'),
    premium: AVAILABLE_MODULES.filter(m => m.category === 'premium')
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {language === 'ar' ? 'إدارة الوحدات' : 'Modules Management'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {language === 'ar'
            ? 'تفعيل أو تعطيل الوحدات حسب احتياجاتك'
            : 'Enable or disable modules based on your needs'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Core Modules */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">
                {language === 'ar' ? 'الوحدات الأساسية' : 'Core Modules'}
              </h2>
              <Badge variant="secondary">
                {language === 'ar' ? 'مطلوبة' : 'Required'}
              </Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupedModules.core.map((module) => {
                const Icon = module.icon;
                const isEnabled = enabledModules.includes(module.code);

                return (
                  <Card key={module.code} className="relative">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {language === 'ar' ? module.name_ar : module.name}
                            </CardTitle>
                          </div>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                      <CardDescription>
                        {language === 'ar' ? module.description_ar : module.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'الحالة:' : 'Status:'}
                        </span>
                        <Badge variant="default">
                          {language === 'ar' ? 'مفعل' : 'Enabled'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Advanced Modules */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {language === 'ar' ? 'الوحدات المتقدمة' : 'Advanced Modules'}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupedModules.advanced.map((module) => {
                const Icon = module.icon;
                const isEnabled = enabledModules.includes(module.code);

                return (
                  <Card key={module.code} className={!isEnabled ? 'opacity-60' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Icon className={`h-5 w-5 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {language === 'ar' ? module.name_ar : module.name}
                            </CardTitle>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleModule(module.code, module.isCore)}
                        />
                      </div>
                      <CardDescription>
                        {language === 'ar' ? module.description_ar : module.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'الحالة:' : 'Status:'}
                        </span>
                        <Badge variant={isEnabled ? 'default' : 'outline'}>
                          {isEnabled
                            ? (language === 'ar' ? 'مفعل' : 'Enabled')
                            : (language === 'ar' ? 'معطل' : 'Disabled')
                          }
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Premium Modules */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">
                {language === 'ar' ? 'الوحدات المميزة' : 'Premium Modules'}
              </h2>
              <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-orange-500">
                {language === 'ar' ? 'بريميوم' : 'Premium'}
              </Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupedModules.premium.map((module) => {
                const Icon = module.icon;
                const isEnabled = enabledModules.includes(module.code);

                return (
                  <Card key={module.code} className={!isEnabled ? 'opacity-60' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isEnabled ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20' : 'bg-muted'}`}>
                            <Icon className={`h-5 w-5 ${isEnabled ? 'text-orange-500' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {language === 'ar' ? module.name_ar : module.name}
                            </CardTitle>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleModule(module.code, module.isCore)}
                        />
                      </div>
                      <CardDescription>
                        {language === 'ar' ? module.description_ar : module.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'الحالة:' : 'Status:'}
                        </span>
                        <Badge variant={isEnabled ? 'default' : 'outline'}>
                          {isEnabled
                            ? (language === 'ar' ? 'مفعل' : 'Enabled')
                            : (language === 'ar' ? 'معطل' : 'Disabled')
                          }
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <CardTitle className="text-base text-blue-900 dark:text-blue-100">
                    {language === 'ar' ? 'ملاحظة هامة' : 'Important Note'}
                  </CardTitle>
                  <CardDescription className="text-blue-700 dark:text-blue-300 mt-2">
                    {language === 'ar'
                      ? 'الوحدات الأساسية (Core) مطلوبة ولا يمكن تعطيلها. يمكنك تفعيل أو تعطيل الوحدات المتقدمة والمميزة حسب احتياجات منشأتك واشتراكك.'
                      : 'Core modules are required and cannot be disabled. You can enable or disable Advanced and Premium modules based on your facility needs and subscription plan.'
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}
    </div>
  );
}
