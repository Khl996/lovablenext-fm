# قاعدة البيانات الكاملة - النسخة النهائية

## ✅ حالة قاعدة البيانات

تم إكمال جميع الجداول المطلوبة: **37 جدول**

---

## الجداول حسب الفئة

### 1. نظام الاشتراكات والمستأجرين (Subscription System) - 6 جداول

#### 1.1 tenants
**الوصف:** المستأجرون (المستشفيات/المنظمات) مع إدارة الاشتراكات الكاملة

**الأعمدة الرئيسية:**
- `id` - UUID Primary Key
- `name`, `slug` - الاسم والمعرف الفريد
- `subscription_status` - حالة الاشتراك (trial/active/suspended/cancelled/expired)
- `plan_id` → subscription_plans - الخطة الحالية
- `subscription_starts_at`, `subscription_ends_at` - فترة الاشتراك
- `trial_ends_at` - انتهاء الفترة التجريبية
- `billing_cycle` - دورة الفوترة (monthly/yearly/custom)
- `payment_method` - طريقة الدفع
- `max_users`, `max_assets`, `max_work_orders_per_month`, `max_storage_mb` - الحدود
- `enabled_modules` - الوحدات المفعلة
- `primary_color`, `secondary_color` - ألوان العلامة التجارية

**العلاقات:**
- → `subscription_plans` (plan_id)
- ← `profiles`, `assets`, `locations`, `work_orders` (tenant_id)

---

#### 1.2 subscription_plans
**الوصف:** خطط الاشتراك المتاحة

**الأعمدة:**
- `code`, `name`, `name_ar` - المعرف والاسم
- `price_monthly`, `price_yearly` - الأسعار
- `is_featured` - خطة مميزة؟
- `included_users`, `included_assets`, `included_storage_mb`, `included_work_orders` - الموارد المتضمنة
- `features` - JSONB قائمة الميزات

**البيانات الموجودة:** 4 خطط (Free Trial, Starter, Professional, Enterprise)

---

#### 1.3 subscription_history
**الوصف:** سجل تغييرات الاشتراكات

**الأعمدة:**
- `tenant_id` - المستأجر
- `old_plan_id`, `new_plan_id` - الخطة القديمة والجديدة
- `old_status`, `new_status` - الحالة القديمة والجديدة
- `old_price`, `new_price` - السعر
- `changed_by`, `change_reason` - من غيّر ولماذا

---

#### 1.4 invoices
**الوصف:** الفواتير

**الأعمدة:**
- `invoice_number` - رقم الفاتورة (فريد)
- `tenant_id` - المستأجر
- `invoice_date`, `due_date`, `paid_at` - التواريخ
- `subtotal`, `discount`, `tax`, `total` - المبالغ
- `status` - الحالة (draft/sent/paid/overdue/cancelled/refunded)

---

#### 1.5 payments
**الوصف:** المدفوعات

**الأعمدة:**
- `invoice_id` - الفاتورة المرتبطة (nullable)
- `tenant_id` - المستأجر
- `amount` - المبلغ
- `payment_method` - طريقة الدفع
- `transaction_reference` - مرجع المعاملة

---

#### 1.6 tenant_modules
**الوصف:** تفعيل الوحدات لكل مستأجر

**الأعمدة:**
- `tenant_id`, `module_code` - المستأجر والوحدة
- `is_enabled` - مفعل؟
- `configuration` - JSONB إعدادات الوحدة
- `enabled_by`, `disabled_by` - من فعّل/عطّل

---

### 2. المستخدمين والأدوار (Users & Roles) - 4 جداول

#### 2.1 profiles
**الوصف:** ملفات المستخدمين

**الأعمدة:**
- `id` → auth.users - مرتبط بالمصادقة
- `tenant_id` - المستأجر
- `full_name`, `full_name_ar` - الاسم
- `email`, `phone` - معلومات الاتصال
- `avatar_url` - صورة الملف الشخصي
- `role` - الدور (owner/admin/technician/platform_owner/...)
- `is_super_admin` - مشرف منصة؟
- `last_activity_at` - آخر نشاط

**العلاقات:**
- → `tenants` (tenant_id)
- ← جميع الجداول التي تحتاج user reference

---

#### 2.2 user_roles
**الوصف:** أدوار إضافية للمستخدم

**الأعمدة:**
- `user_id`, `role`, `hospital_id`
- الأدوار: hospital_admin, maintenance_manager, supervisor, engineer, technician, viewer, platform roles

---

#### 2.3 custom_user_roles
**الوصف:** أدوار مخصصة

**الأعمدة:**
- `user_id`, `role_code`, `hospital_id`

---

#### 2.4 teams
**الوصف:** فرق العمل

**الأعمدة:**
- `code`, `name`, `name_ar`
- `type` - النوع (maintenance/engineering/operations/support/custom)
- `status` - الحالة (active/inactive/archived)
- `hospital_id` - المستشفى

**العلاقات:**
- → `hospitals`
- ← `team_members`, `work_orders`, `operation_logs`

---

#### 2.5 team_members
**الوصف:** أعضاء الفرق

**الأعمدة:**
- `team_id`, `user_id`
- `role` - دور في الفريق (leader/member/supervisor)
- `specialization` - array of specializations
- `certifications` - JSONB شهادات

---

### 3. بنية المستشفى (Hospital Structure) - 5 جداول

#### 3.1 hospitals
**الوصف:** المستشفيات/المنظمات

**الأعمدة:**
- `code`, `name`, `name_ar` - المعرف والاسم
- `type` - نوع المستشفى
- `status` - الحالة (active/suspended/archived)
- `address`, `phone`, `email` - معلومات الاتصال
- `suspended_at`, `suspended_by`, `suspension_reason` - التعليق

**العلاقات:**
- ← `buildings`, `teams`, `assets`, `work_orders`, وجميع البيانات المرتبطة بالمستشفى

---

#### 3.2 buildings
**الوصف:** المباني

**الأعمدة:**
- `code`, `name`, `name_ar`, `description`
- `hospital_id` - المستشفى

**العلاقات:**
- → `hospitals`
- ← `floors`

---

#### 3.3 floors
**الوصف:** الطوابق

**الأعمدة:**
- `code`, `name`, `name_ar`
- `level` - رقم الطابق
- `building_id` - المبنى

**العلاقات:**
- → `buildings`
- ← `departments`

---

#### 3.4 departments
**الوصف:** الأقسام

**الأعمدة:**
- `code`, `name`, `name_ar`
- `floor_id` - الطابق

**العلاقات:**
- → `floors`
- ← `rooms`

---

#### 3.5 rooms
**الوصف:** الغرف

**الأعمدة:**
- `code`, `name`, `name_ar`
- `department_id` - القسم
- `coordinates_x`, `coordinates_y` - الإحداثيات

**العلاقات:**
- → `departments`

---

### 4. الأصول (Assets) - 3 جداول

#### 4.1 assets
**الوصف:** الأصول والمعدات (محدث بالكامل!)

**الأعمدة الأساسية:**
- `code`, `name`, `name_ar` - المعرف والاسم
- `category`, `subcategory`, `type` - التصنيف
- `status` - الحالة (operational/under_maintenance/out_of_service/...)
- `criticality` - الأهمية (low/medium/high/critical)

**المواصفات الفنية:**
- `model`, `serial_number`, `manufacturer`, `manufacture_year`
- `specifications` - JSONB

**المالية:**
- `purchase_date`, `purchase_cost`
- `installation_date`
- `depreciation_annual`, `expected_lifespan_years`

**الضمان:**
- `warranty_provider`, `warranty_expiry`, `supplier`

**الموقع:**
- `tenant_id` - المستأجر
- `hospital_id` - المستشفى
- `building_id`, `floor_id`, `department_id`, `room_id` - الموقع الدقيق
- `location_id` - نظام الموقع القديم
- `coordinates_x`, `coordinates_y` - الإحداثيات

**التسلسل الهرمي:**
- `parent_asset_id` - الأصل الأب (للمكونات)

**أخرى:**
- `qr_code` - الكود الفريد (unique)

**العلاقات:**
- → `tenants`, `hospitals`, `buildings`, `floors`, `departments`, `rooms`
- → `assets` (parent_asset_id)
- ← `work_orders`, `operation_logs`, `calibration_records`

---

#### 4.2 asset_categories
**الوصف:** فئات الأصول

**الأعمدة:**
- `code`, `name`, `name_ar`
- `hospital_id`
- `is_active`, `display_order`

---

#### 4.3 calibration_records
**الوصف:** سجلات المعايرة

**الأعمدة:**
- `asset_id` - الأصل
- `calibration_date`, `next_calibration_date`
- `performed_by` - من قام بها
- `company_id` - الشركة
- `certificate_number`, `standard_used`
- `results` - JSONB نتائج
- `status` - النتيجة (pass/fail/conditional_pass)
- `attachments` - array of files
- `cost` - التكلفة

---

### 5. أوامر العمل (Work Orders) - 5 جداول

#### 5.1 work_orders
**الوصف:** أوامر العمل (محدث بالكامل!)

**الأعمدة الأساسية:**
- `code`, `title`, `description` - المعرف والوصف
- `ticket_id` - رقم التذكرة (legacy)
- `issue_type` - نوع المشكلة
- `status` - الحالة (pending/assigned/in_progress/pending_supervisor_approval/...)
- `priority` - الأولوية (low/medium/high/urgent)

**الأشخاص:**
- `reported_by` - المبلغ
- `assigned_to` - المسند إليه
- `assigned_team` - الفريق المسند
- `created_by` - من أنشأ

**الموقع:**
- `tenant_id`, `hospital_id`
- `building_id`, `floor_id`, `department_id`, `room_id` - الموقع الدقيق
- `location_id` - نظام الموقع القديم
- `asset_id` - الأصل المرتبط
- `company_id` - شركة خارجية

**التوقيت:**
- `reported_at` - وقت التبليغ
- `start_time`, `end_time` - وقت البدء والانتهاء
- `completed_at` - وقت الإنجاز

**سير العمل (Workflow):**
- Technician: `technician_completed_at`, `technician_notes`
- Supervisor: `supervisor_approved_at`, `supervisor_approved_by`, `supervisor_notes`
- Engineer: `engineer_approved_at`, `engineer_approved_by`, `engineer_notes`
- Reporter: `customer_reviewed_at`, `customer_reviewed_by`, `reporter_notes`
- Maintenance Manager: `maintenance_manager_approved_at`, `maintenance_manager_approved_by`, `maintenance_manager_notes`

**الإغلاق التلقائي:**
- `auto_closed_at` - وقت الإغلاق التلقائي
- `pending_closure_since` - في انتظار الإغلاق منذ

**العلاقات:**
- → `tenants`, `hospitals`, `buildings`, `floors`, `departments`, `rooms`, `assets`, `teams`, `companies`
- → `profiles` (assigned_to, reported_by, created_by, supervisors, engineers)
- ← `operation_logs`, `work_order_costs`

---

#### 5.2 issue_types
**الوصف:** أنواع المشاكل

**الأعمدة:**
- `code`, `name`, `name_ar`
- `hospital_id`
- `is_active`, `display_order`

---

#### 5.3 work_order_statuses
**الوصف:** حالات أوامر العمل المخصصة

**الأعمدة:**
- `code`, `name`, `name_ar`
- `category` - الفئة (open/in_progress/pending/completed/cancelled)
- `color` - اللون
- `hospital_id`

---

#### 5.4 priorities
**الوصف:** الأولويات

**الأعمدة:**
- `code`, `name`, `name_ar`
- `level` - المستوى (رقمي)
- `color` - اللون
- `hospital_id`

---

#### 5.5 work_order_costs
**الوصف:** تكاليف أوامر العمل

**الأعمدة:**
- `work_order_id` - أمر العمل
- `cost_type` - نوع التكلفة (labor/parts/materials/external_service/...)
- `description` - الوصف
- `quantity`, `unit_cost`, `total_cost` - الكميات والتكاليف
- `currency` - العملة (SAR)
- `vendor_id` - المورد
- `invoice_number`, `invoice_date` - بيانات الفاتورة

---

#### 5.6 operation_logs
**الوصف:** سجل العمليات

**الأعمدة:**
- `code` - المعرف
- `type` - النوع (maintenance/repair/inspection/emergency/...)
- `asset_id`, `asset_name` - الأصل
- `location`, `system_type` - الموقع ونوع النظام
- `reason`, `description` - السبب والوصف
- `performed_by`, `technician_name`, `team` - المنفذ
- `timestamp`, `start_time`, `end_time` - التوقيت
- `estimated_duration`, `actual_duration` - المدة
- `status` - الحالة (in_progress/completed/cancelled/pending_approval)
- `related_work_order` - أمر العمل المرتبط
- `photos` - array صور
- `notes` - ملاحظات
- `approval_required`, `approved_by`, `approved_at`, `approval_notes` - الموافقة
- `emergency_measures`, `affected_areas`, `notified_parties` - حالات الطوارئ

---

### 6. الصيانة (Maintenance) - 2 جداول

#### 6.1 maintenance_plans
**الوصف:** خطط الصيانة السنوية

**الأعمدة:**
- `code`, `name`, `name_ar`
- `year` - السنة
- `department` - القسم
- `status` - الحالة (draft/approved/in_progress/completed/cancelled)
- `budget`, `budget_utilization` - الميزانية والاستخدام
- `completion_rate`, `on_time_rate`, `quality_score` - مؤشرات الأداء
- `hospital_id`

---

#### 6.2 maintenance_tasks
**الوصف:** مهام الصيانة

**الأعمدة:**
- `code`, `name`, `name_ar`
- `type` - النوع (preventive/corrective/predictive)
- `status` - الحالة (pending/scheduled/in_progress/completed/...)
- `frequency` - التكرار (daily/weekly/monthly/...)
- `start_date`, `end_date`, `duration_days` - الفترة
- `progress` - نسبة الإنجاز
- `is_critical` - حرجة؟
- `plan_id` - الخطة
- `assigned_to` - المسند إليه
- `depends_on` - تعتمد على مهمة أخرى
- `checklist` - JSONB قائمة التحقق

---

### 7. الشركات والعقود (Companies & Contracts) - 3 جداول

#### 7.1 companies
**الوصف:** الموردون والمقاولون

**الأعمدة:**
- `code`, `name`, `name_ar`
- `type` - النوع (supplier/vendor/contractor/manufacturer/service_provider)
- `contact_person`, `email`, `phone`, `address`
- `tax_number` - الرقم الضريبي
- `status` - الحالة (active/inactive)
- `hospital_id`

**العلاقات:**
- ← `contracts`, `work_orders`, `calibration_records`, `inventory_items`, `work_order_costs`

---

#### 7.2 contracts
**الوصف:** العقود

**الأعمدة:**
- `code`, `name`, `name_ar`
- `type` - النوع (maintenance/service/supply/warranty/lease)
- `company_id` - الشركة
- `start_date`, `end_date` - الفترة
- `value` - القيمة
- `payment_terms`, `renewal_terms` - شروط الدفع والتجديد
- `status` - الحالة (draft/active/expired/cancelled/renewed)
- `hospital_id`

---

#### 7.3 specializations
**الوصف:** التخصصات

**الأعمدة:**
- `code`, `name`, `name_ar`
- `hospital_id`
- `is_active`, `display_order`

---

### 8. المخزون (Inventory) - 2 جداول

#### 8.1 inventory_items
**الوصف:** قطع الغيار والمواد الاستهلاكية

**الأعمدة:**
- `code`, `name`, `name_ar`
- `category` - الفئة (spare_part/consumable/tool/material/chemical/equipment)
- `subcategory`
- `unit_of_measure` - وحدة القياس (piece/liter/kg/...)
- `current_stock`, `min_stock`, `max_stock`, `reorder_point` - المخزون
- `unit_cost`, `total_value` - التكلفة (total_value محسوب تلقائياً)
- `supplier_id` - المورد
- `location` - موقع التخزين
- `barcode` - الباركود (unique)
- `specifications` - JSONB
- `hospital_id`

---

#### 8.2 inventory_transactions
**الوصف:** حركات المخزون

**الأعمدة:**
- `item_id` - العنصر
- `type` - النوع (purchase/usage/transfer/adjustment/return/disposal)
- `quantity` - الكمية
- `unit_cost`, `total_cost` - التكلفة (total_cost محسوب تلقائياً)
- `transaction_date` - التاريخ
- `reference_type`, `reference_id` - المرجع (work_order/maintenance_task/manual/auto_reorder)
- `from_location`, `to_location` - من/إلى
- `performed_by` - المنفذ
- `hospital_id`

---

### 9. الإشعارات (Notifications) - 2 جداول

#### 9.1 notifications
**الوصف:** إشعارات المستخدمين

**الأعمدة:**
- `user_id` - المستخدم
- `type` - النوع (work_order_assigned/completed/approved/maintenance_task_due/...)
- `title`, `title_ar` - العنوان
- `message`, `message_ar` - الرسالة
- `related_task_id` - المهمة المرتبطة
- `is_read` - مقروءة؟

---

#### 9.2 notification_preferences
**الوصف:** تفضيلات الإشعارات

**الأعمدة:**
- `user_id` - المستخدم (unique)
- `email_enabled`, `in_app_enabled` - مفعل؟
- `task_assignments`, `upcoming_tasks`, `overdue_tasks`, `task_completions` - أنواع الإشعارات
- `days_before_due` - كم يوم قبل الموعد

---

### 10. الإعدادات (Settings) - 2 جداول

#### 10.1 system_settings
**الوصف:** إعدادات النظام

**الأعمدة:**
- `hospital_id` - المستشفى (nullable للإعدادات العامة)
- `setting_key` - المفتاح
- `setting_value` - JSONB القيمة
- `setting_type` - النوع (global/hospital/module)
- `module_name` - اسم الوحدة
- `is_system` - إعداد نظامي؟
- `updated_by` - من حدّث

---

#### 10.2 sla_templates
**الوصف:** نماذج اتفاقيات مستوى الخدمة

**الأعمدة:**
- `code`, `name`, `name_ar`
- `priority_id` - الأولوية
- `response_time_hours` - وقت الاستجابة (بالساعات)
- `resolution_time_hours` - وقت الحل (بالساعات)
- `hospital_id`

---

#### 10.3 locations (قديم - للتوافق)
**الوصف:** نظام المواقع القديم (hierarchical)

**ملاحظة:** موجود للتوافق مع الكود القديم. النظام الجديد يستخدم hospitals→buildings→floors→departments→rooms

---

## إجمالي الجداول: 37 جدول

### الإحصائيات:
- ✅ Subscription System: 6 جداول
- ✅ Users & Roles: 5 جداول
- ✅ Hospital Structure: 5 جداول
- ✅ Assets: 3 جداول
- ✅ Work Orders: 6 جداول
- ✅ Maintenance: 2 جداول
- ✅ Companies & Contracts: 3 جداول
- ✅ Inventory: 2 جداول
- ✅ Notifications: 2 جداول
- ✅ Settings & Others: 3 جداول

---

## العلاقات الرئيسية

### Tenant-Based (Multi-tenancy)
```
tenants
  ├── profiles (tenant_id)
  ├── assets (tenant_id)
  ├── locations (tenant_id)
  ├── work_orders (tenant_id)
  └── [other tenant-specific data]
```

### Hospital-Based (Structure)
```
hospitals
  ├── buildings
  │   ├── floors
  │   │   ├── departments
  │   │   │   └── rooms
  │   │   └── [assets, work_orders]
  │   └── [assets, work_orders]
  ├── teams
  ├── assets (hospital_id)
  ├── work_orders (hospital_id)
  └── [all hospital-specific data]
```

### Work Order Flow
```
work_orders
  ├── asset_id → assets
  ├── assigned_to → profiles
  ├── assigned_team → teams
  ├── reported_by → profiles
  ├── company_id → companies
  ├── hospital/building/floor/department/room → location structure
  ├── operation_logs (related_work_order)
  └── work_order_costs (work_order_id)
```

### Subscription Flow
```
subscription_plans
  └── tenants (plan_id)
      ├── invoices (tenant_id)
      │   └── payments (invoice_id)
      ├── subscription_history (tenant_id)
      └── tenant_modules (tenant_id)
```

---

## RLS (Row Level Security)

جميع الجداول محمية بـ RLS:
- ✅ Platform admins (is_super_admin = true) يمكنهم رؤية كل شيء
- ✅ Hospital/Tenant admins يرون بيانات مستشفاهم فقط
- ✅ Users يرون البيانات المتعلقة بهم فقط

---

## الفهارس (Indexes)

تم إنشاء فهارس على:
- جميع Foreign Keys
- الأعمدة المستخدمة في البحث (code, status, etc.)
- الأعمدة المستخدمة في الفرز (created_at, date fields)
- الأعمدة الفريدة (email, qr_code, barcode, etc.)

---

## الميزات المتقدمة

### Generated Columns
- `inventory_items.total_value` = current_stock * unit_cost
- `inventory_transactions.total_cost` = quantity * unit_cost
- `work_order_costs.total_cost` = quantity * unit_cost

### Check Constraints
جميع ENUMs محمية بـ CHECK constraints لضمان صحة البيانات

### Cascading Deletes
- ON DELETE CASCADE على العلاقات الهرمية (buildings→floors→departments→rooms)
- ON DELETE CASCADE على العلاقات التابعة (tenant_id, hospital_id)

---

## التاريخ

**تم الإكمال:** 2026-01-02
**الحالة:** ✅ جميع الجداول مكتملة ومحدثة
**الإصدار:** 1.0.0
