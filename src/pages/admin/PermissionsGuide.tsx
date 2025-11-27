import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, Users, Building2, Package, ClipboardList, Wrench, Database, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PermissionsGuide() {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const roles = [
    {
      name: 'Global Admin',
      nameAr: 'المدير العام للنظام',
      color: 'bg-red-500',
      icon: Shield,
      description: 'Full system access across all hospitals',
      descriptionAr: 'وصول كامل للنظام عبر جميع المستشفيات',
      permissions: ['All permissions', 'Manage all hospitals', 'System configuration']
    },
    {
      name: 'Hospital Admin',
      nameAr: 'مدير المستشفى',
      color: 'bg-purple-500',
      icon: Building2,
      description: 'Full access within hospital',
      descriptionAr: 'وصول كامل داخل المستشفى',
      permissions: ['Manage all modules', 'View all data', 'Manage users & teams', 'Executive dashboard']
    },
    {
      name: 'Facility Manager',
      nameAr: 'مدير المرافق',
      color: 'bg-blue-500',
      icon: Building2,
      description: 'Manages facilities, assets, and operations',
      descriptionAr: 'إدارة المرافق والأصول والعمليات',
      permissions: ['Manage facilities', 'Manage assets', 'Manage inventory', 'Manage teams', 'View all work orders']
    },
    {
      name: 'Maintenance Manager',
      nameAr: 'مدير الصيانة',
      color: 'bg-orange-500',
      icon: Wrench,
      description: 'Oversees maintenance operations',
      descriptionAr: 'إشراف على عمليات الصيانة',
      permissions: ['Manage maintenance plans', 'Manage assets', 'Manage inventory', 'Manage teams', 'Final approval on work orders']
    },
    {
      name: 'Supervisor',
      nameAr: 'المشرف',
      color: 'bg-green-500',
      icon: Users,
      description: 'Supervises technicians and approves work',
      descriptionAr: 'إشراف على الفنيين واعتماد الأعمال',
      permissions: ['View assets & facilities', 'Approve work orders', 'View teams', 'Consume inventory items']
    },
    {
      name: 'Engineer',
      nameAr: 'المهندس',
      color: 'bg-cyan-500',
      icon: Wrench,
      description: 'Reviews and validates completed work',
      descriptionAr: 'مراجعة والتحقق من الأعمال المنجزة',
      permissions: ['View assets & facilities', 'Review work orders', 'Execute maintenance', 'View inventory']
    },
    {
      name: 'Technician',
      nameAr: 'الفني',
      color: 'bg-yellow-500',
      icon: UsersRound,
      description: 'Executes maintenance work',
      descriptionAr: 'تنفيذ أعمال الصيانة',
      permissions: ['View assets', 'Start/complete work orders', 'Consume inventory items', 'Create operations log']
    },
    {
      name: 'Reporter',
      nameAr: 'المبلّغ',
      color: 'bg-gray-500',
      icon: ClipboardList,
      description: 'Reports issues and closes work orders',
      descriptionAr: 'إبلاغ عن المشاكل وإغلاق أوامر العمل',
      permissions: ['Create work orders', 'View own work orders', 'Close work orders', 'View facilities']
    }
  ];

  const modules = [
    { name: 'Facilities', nameAr: 'المرافق', icon: Building2 },
    { name: 'Assets', nameAr: 'الأصول', icon: Package },
    { name: 'Work Orders', nameAr: 'أوامر العمل', icon: ClipboardList },
    { name: 'Inventory', nameAr: 'المخزون', icon: Database },
    { name: 'Maintenance', nameAr: 'الصيانة', icon: Wrench },
    { name: 'Teams', nameAr: 'الفرق', icon: UsersRound },
    { name: 'Operations Log', nameAr: 'سجل العمليات', icon: ClipboardList }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isRTL ? 'دليل الصلاحيات' : 'Permissions Guide'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isRTL 
              ? 'دليل شامل لصلاحيات ومسؤوليات كل دور في النظام'
              : 'Comprehensive guide to roles, permissions, and responsibilities'}
          </p>
        </div>
        <Shield className="h-12 w-12 text-primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? 'نظرة عامة' : 'Overview'}</CardTitle>
          <CardDescription>
            {isRTL
              ? 'نظام الصلاحيات يتحكم في من يمكنه عرض وإدارة كل وحدة من وحدات النظام. الصلاحيات مبنية على الأدوار ويمكن تخصيصها لكل مستخدم.'
              : 'The permissions system controls who can view and manage each module in the system. Permissions are role-based and can be customized per user.'}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        <h2 className="text-2xl font-bold">
          {isRTL ? 'الأدوار والصلاحيات' : 'Roles & Permissions'}
        </h2>
        
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Card key={role.name}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${role.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      {isRTL ? role.nameAr : role.name}
                    </CardTitle>
                    <CardDescription>
                      {isRTL ? role.descriptionAr : role.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((permission) => (
                    <Badge key={permission} variant="secondary">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? 'الوحدات الرئيسية' : 'Core Modules'}</CardTitle>
          <CardDescription>
            {isRTL
              ? 'الوحدات الأساسية في النظام والأدوار التي يمكنها الوصول إليها'
              : 'Core modules in the system and roles that can access them'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <div key={module.name} className="flex items-center gap-3 p-4 border rounded-lg">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {isRTL ? module.nameAr : module.name}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isRTL ? 'ملاحظة مهمة' : 'Important Note'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            {isRTL
              ? 'الصلاحيات يتم إدارتها من قاعدة البيانات ويمكن تخصيصها لكل مستخدم عبر صفحة المستخدمين. لتعديل صلاحيات مستخدم محدد، انتقل إلى صفحة المستخدمين واختر المستخدم المطلوب.'
              : 'Permissions are managed from the database and can be customized per user through the Users page. To modify a specific user\'s permissions, go to the Users page and select the desired user.'}
          </p>
          <p className="text-sm font-medium">
            {isRTL
              ? 'للمزيد من التفاصيل، راجع ملف PERMISSIONS_SYSTEM_GUIDE.md في مجلد المشروع.'
              : 'For more details, refer to PERMISSIONS_SYSTEM_GUIDE.md in the project folder.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
