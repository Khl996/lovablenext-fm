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
    addAsset: 'إضافة أصل',
    category: 'الفئة',
    status: 'الحالة',
    criticality: 'الأهمية',
    location: 'الموقع',
    filterByLocation: 'تصفية حسب الموقع',
    
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
    permissions: 'الصلاحيات',
    rolePermissions: 'صلاحيات الأدوار',
    userPermissions: 'صلاحيات المستخدمين',
    permissionKey: 'الصلاحية',
    effect: 'التأثير',
    grant: 'منح',
    deny: 'منع',
    permissionCategory: 'الفئة',
    manageRolePermissions: 'إدارة صلاحيات الأدوار',
    additionalPermissions: 'صلاحيات إضافية',
    addPermission: 'إضافة صلاحية',
    noPermissionsAssigned: 'لا توجد صلاحيات إضافية محددة',
    accessControl: 'التحكم في الوصول',
    accessDenied: 'تم رفض الوصول',
    
    // Facility Locations
    facilityLocations: 'مواقع المرافق',
    manageFacilityStructure: 'إدارة المباني والطوابق والأقسام والغرف',
    buildings: 'المباني',
    building: 'المبنى',
    addBuilding: 'إضافة مبنى',
    editBuilding: 'تعديل مبنى',
    selectBuilding: 'اختر مبنى',
    floors: 'الطوابق',
    floor: 'الطابق',
    addFloor: 'إضافة طابق',
    editFloor: 'تعديل طابق',
    selectFloor: 'اختر طابق',
    level: 'المستوى',
    departments: 'الأقسام',
    department: 'القسم',
    addDepartment: 'إضافة قسم',
    editDepartment: 'تعديل قسم',
    selectDepartment: 'اختر قسم',
    rooms: 'الغرف',
    room: 'الغرفة',
    addRoom: 'إضافة غرفة',
    editRoom: 'تعديل غرفة',
    selectRoom: 'اختر غرفة',
    coordinates: 'الإحداثيات',
    coordinateX: 'الإحداثي X',
    coordinateY: 'الإحداثي Y',
    nameArabic: 'الاسم بالعربية',
    name: 'الاسم',
    code: 'الرمز',
    actions: 'الإجراءات',
    hospitalAdded: 'تم إضافة المستشفى بنجاح',
    hospitalUpdated: 'تم تحديث المستشفى بنجاح',
    profileUpdated: 'تم تحديث الملف الشخصي بنجاح',
    roleAdded: 'تم إضافة الدور بنجاح',
    roleDeleted: 'تم حذف الدور بنجاح',
    errorOccurred: 'حدث خطأ',
    fillRequired: 'يرجى ملء جميع الحقول المطلوبة',
    confirmDeleteRole: 'هل أنت متأكد من حذف هذا الدور؟',
    userDetails: 'تفاصيل المستخدم',
    editProfile: 'تعديل البيانات',
    editHospital: 'تعديل المستشفى',
    fullNameAr: 'الاسم بالعربية',
    addRole: 'إضافة دور',
    noPermission: 'ليس لديك صلاحية للوصول',
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
    addAsset: 'Add Asset',
    category: 'Category',
    status: 'Status',
    criticality: 'Criticality',
    location: 'Location',
    filterByLocation: 'Filter by Location',
    
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
    permissions: 'Permissions',
    rolePermissions: 'Role Permissions',
    userPermissions: 'User Permissions',
    permissionKey: 'Permission',
    effect: 'Effect',
    grant: 'Grant',
    deny: 'Deny',
    permissionCategory: 'Category',
    manageRolePermissions: 'Manage Role Permissions',
    additionalPermissions: 'Additional Permissions',
    addPermission: 'Add Permission',
    noPermissionsAssigned: 'No additional permissions assigned',
    accessControl: 'Access Control',
    accessDenied: 'Access Denied',
    
    // Facility Locations
    facilityLocations: 'Facility Locations',
    manageFacilityStructure: 'Manage Buildings, Floors, Departments & Rooms',
    buildings: 'Buildings',
    building: 'Building',
    addBuilding: 'Add Building',
    editBuilding: 'Edit Building',
    selectBuilding: 'Select Building',
    floors: 'Floors',
    floor: 'Floor',
    addFloor: 'Add Floor',
    editFloor: 'Edit Floor',
    selectFloor: 'Select Floor',
    level: 'Level',
    departments: 'Departments',
    department: 'Department',
    addDepartment: 'Add Department',
    editDepartment: 'Edit Department',
    selectDepartment: 'Select Department',
    rooms: 'Rooms',
    room: 'Room',
    addRoom: 'Add Room',
    editRoom: 'Edit Room',
    selectRoom: 'Select Room',
    coordinates: 'Coordinates',
    coordinateX: 'X Coordinate',
    coordinateY: 'Y Coordinate',
    nameArabic: 'Arabic Name',
    name: 'Name',
    code: 'Code',
    actions: 'Actions',
    hospitalAdded: 'Hospital added successfully',
    hospitalUpdated: 'Hospital updated successfully',
    profileUpdated: 'Profile updated successfully',
    roleAdded: 'Role added successfully',
    roleDeleted: 'Role deleted successfully',
    errorOccurred: 'An error occurred',
    fillRequired: 'Please fill all required fields',
    confirmDeleteRole: 'Are you sure you want to delete this role?',
    userDetails: 'User Details',
    editProfile: 'Edit Profile',
    editHospital: 'Edit Hospital',
    fullNameAr: 'Full Name (Arabic)',
    addRole: 'Add Role',
    noPermission: 'You do not have permission to access this',
  },
};

export type TranslationKey = keyof typeof translations.en;

export function translate(key: TranslationKey, lang: Language = 'en'): string {
  return translations[lang][key] || translations.en[key] || key;
}

export function getDirection(lang: Language): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}
