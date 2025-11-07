// Internationalization utilities for Arabic and English

export type Language = 'ar' | 'en';

// Translation keys structure
export const translations = {
  ar: {
    // Common
    welcome: 'مرحباً',
    loading: 'جاري التحميل...',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    search: 'بحث',
    filter: 'تصفية',
    logout: 'تسجيل الخروج',
    profile: 'الملف الشخصي',
    
    // Auth
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    fullName: 'الاسم الكامل',
    phone: 'رقم الهاتف',
    hospital: 'المستشفى',
    
    // Navigation
    dashboard: 'لوحة التحكم',
    facilities: 'المرافق',
    assets: 'الأصول',
    workOrders: 'أوامر العمل',
    operations: 'سجل العمليات',
    maintenance: 'الصيانة',
    reports: 'التقارير',
    settings: 'الإعدادات',
    
    // Dashboard
    totalAssets: 'إجمالي الأصول',
    activeWorkOrders: 'أوامر العمل النشطة',
    criticalAssets: 'الأصول الحرجة',
    completedToday: 'المكتملة اليوم',
    
    // Assets
    assetCode: 'رمز الأصل',
    assetName: 'اسم الأصل',
    category: 'الفئة',
    status: 'الحالة',
    criticality: 'الأهمية',
    location: 'الموقع',
    
    // Work Orders
    workOrder: 'أمر عمل',
    priority: 'الأولوية',
    assignedTo: 'مسند إلى',
    reportedBy: 'تم الإبلاغ بواسطة',
    dueDate: 'تاريخ الاستحقاق',
    description: 'الوصف',
    
    // Status
    active: 'نشط',
    inactive: 'غير نشط',
    pending: 'قيد المراجعة',
    inProgress: 'قيد التنفيذ',
    completed: 'مكتمل',
    cancelled: 'ملغى',
  },
  en: {
    // Common
    welcome: 'Welcome',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    logout: 'Logout',
    profile: 'Profile',
    
    // Auth
    email: 'Email',
    password: 'Password',
    login: 'Login',
    signup: 'Sign Up',
    fullName: 'Full Name',
    phone: 'Phone',
    hospital: 'Hospital',
    
    // Navigation
    dashboard: 'Dashboard',
    facilities: 'Facilities',
    assets: 'Assets',
    workOrders: 'Work Orders',
    operations: 'Operations Log',
    maintenance: 'Maintenance',
    reports: 'Reports',
    settings: 'Settings',
    
    // Dashboard
    totalAssets: 'Total Assets',
    activeWorkOrders: 'Active Work Orders',
    criticalAssets: 'Critical Assets',
    completedToday: 'Completed Today',
    
    // Assets
    assetCode: 'Asset Code',
    assetName: 'Asset Name',
    category: 'Category',
    status: 'Status',
    criticality: 'Criticality',
    location: 'Location',
    
    // Work Orders
    workOrder: 'Work Order',
    priority: 'Priority',
    assignedTo: 'Assigned To',
    reportedBy: 'Reported By',
    dueDate: 'Due Date',
    description: 'Description',
    
    // Status
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    inProgress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  },
};

export type TranslationKey = keyof typeof translations.en;

export function translate(key: TranslationKey, lang: Language = 'en'): string {
  return translations[lang][key] || translations.en[key] || key;
}

export function getDirection(lang: Language): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}
