# Platform Owner Setup Guide

تم إنشاء حساب مالك المنصة بنجاح!

## معلومات الدخول

**البريد الإلكتروني:** khalid.a.kh990@gmail.com
**كلمة المرور:** Khalid@5452

## طريقة الإعداد

### الطريقة 1: استخدام صفحة الإعداد (Setup Page)

1. افتح المتصفح وانتقل إلى: `http://localhost:5173/setup`
2. املأ البيانات التالية:
   - Email: `khalid.a.kh990@gmail.com`
   - Password: `Khalid@5452`
   - Full Name: `Khalid`
   - Full Name (Arabic): `خالد`
   - Setup Key: `mutqan-2026-setup`
3. اضغط على "Create Platform Owner"
4. بعد النجاح، ستتم إعادة توجيهك تلقائياً إلى صفحة تسجيل الدخول

### الطريقة 2: من خلال Supabase Dashboard

إذا لم تعمل الطريقة الأولى، يمكنك إنشاء الحساب يدوياً:

#### الخطوة 1: إنشاء المستخدم في Authentication

1. اذهب إلى Supabase Dashboard
2. افتح مشروعك
3. اذهب إلى **Authentication** > **Users**
4. اضغط على **Add user** > **Create new user**
5. املأ البيانات:
   - Email: `khalid.a.kh990@gmail.com`
   - Password: `Khalid@5452`
   - ✓ Auto Confirm User
6. اضغط **Create user**
7. **انسخ User ID** (ستحتاجه في الخطوة التالية)

#### الخطوة 2: إضافة Profile

1. اذهب إلى **Table Editor** > **profiles**
2. اضغط **Insert** > **Insert row**
3. املأ البيانات:
   - id: `[User ID الذي نسخته]`
   - email: `khalid.a.kh990@gmail.com`
   - full_name: `Khalid`
   - full_name_ar: `خالد`
   - is_super_admin: `true`
   - role: `platform_owner`
4. اضغط **Save**

## تسجيل الدخول

بعد إنشاء الحساب:

1. افتح المتصفح وانتقل إلى: `http://localhost:5173/auth`
2. أدخل البريد الإلكتروني: `khalid.a.kh990@gmail.com`
3. أدخل كلمة المرور: `Khalid@5452`
4. اضغط **Sign In**

## الصلاحيات

بصفتك مالك المنصة (Platform Owner)، لديك الصلاحيات التالية:

✓ الوصول الكامل لكافة المستشفيات والبيانات
✓ إدارة المستأجرين (Tenants Management)
✓ عرض إحصائيات المنصة
✓ إدارة الاشتراكات والفواتير
✓ تعليق أو تفعيل حسابات المستأجرين

## قائمة Platform Administration

بعد تسجيل الدخول، ستجد في القائمة الجانبية قسم جديد:

**Platform Administration**
- Platform Dashboard - لوحة تحكم المنصة
- Tenants - إدارة المستأجرين

## ملاحظات مهمة

- هذا الحساب له صلاحيات كاملة على النظام بأكمله
- لا تشارك بيانات الدخول مع أحد
- يُنصح بتغيير كلمة المرور بعد أول تسجيل دخول من صفحة Profile
- Setup Key المستخدم: `mutqan-2026-setup`

## في حالة المشاكل

إذا واجهت أي مشكلة:

1. تأكد من أن قاعدة البيانات متصلة
2. تأكد من أن Edge Function `setup-first-owner` منشور بنجاح
3. راجع Console للتحقق من وجود أخطاء
4. استخدم الطريقة 2 (Supabase Dashboard) كحل بديل
