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
    
    // Users & Roles
    users: 'المستخدمين',
    addUser: 'إضافة مستخدم',
    role: 'الدور',
    roles: 'الأدوار',
    selectRole: 'اختر الدور',
    selectHospital: 'اختر المستشفى',
    
    // Roles
    globalAdmin: 'مدير النظام',
    hospitalAdmin: 'مدير المستشفى',
    facilityManager: 'مدير المرافق',
    maintenanceManager: 'مدير الصيانة',
    supervisor: 'مشرف',
    technician: 'فني',
    reporter: 'مبلغ',
    
    // Hospitals
    addHospital: 'إضافة مستشفى',
    hospitalName: 'اسم المستشفى',
    hospitalNameAr: 'اسم المستشفى بالعربية',
    hospitalType: 'نوع المستشفى',
    address: 'العنوان',
    
    // Actions
    submit: 'إرسال',
    close: 'إغلاق',
    back: 'رجوع',
    next: 'التالي',
    confirm: 'تأكيد',
    success: 'نجح',
    error: 'خطأ',
    
    // Messages
    userAdded: 'تم إضافة المستخدم بنجاح',
    hospitalAdded: 'تم إضافة المستشفى بنجاح',
    errorOccurred: 'حدث خطأ',
    fillRequired: 'يرجى ملء جميع الحقول المطلوبة',
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
    
    // Users & Roles
    users: 'Users',
    addUser: 'Add User',
    role: 'Role',
    roles: 'Roles',
    selectRole: 'Select Role',
    selectHospital: 'Select Hospital',
    
    // Roles
    globalAdmin: 'Global Admin',
    hospitalAdmin: 'Hospital Admin',
    facilityManager: 'Facility Manager',
    maintenanceManager: 'Maintenance Manager',
    supervisor: 'Supervisor',
    technician: 'Technician',
    reporter: 'Reporter',
    
    // Hospitals
    addHospital: 'Add Hospital',
    hospitalName: 'Hospital Name',
    hospitalNameAr: 'Hospital Name (Arabic)',
    hospitalType: 'Hospital Type',
    address: 'Address',
    
    // Actions
    submit: 'Submit',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    confirm: 'Confirm',
    success: 'Success',
    error: 'Error',
    
    // Messages
    userAdded: 'User added successfully',
    hospitalAdded: 'Hospital added successfully',
    errorOccurred: 'An error occurred',
    fillRequired: 'Please fill all required fields',
  },
};

export type TranslationKey = keyof typeof translations.en;

export function translate(key: TranslationKey, lang: Language = 'en'): string {
  return translations[lang][key] || translations.en[key] || key;
}

export function getDirection(lang: Language): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}
