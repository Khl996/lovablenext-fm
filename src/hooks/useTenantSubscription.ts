import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TenantSubscription, SubscriptionInfo, SubscriptionStatus } from '@/types';
import { toast } from '@/hooks/use-toast';

export const useTenantSubscription = () => {
  const [loading, setLoading] = useState(false);

  const getTenantSubscription = async (tenantId: string): Promise<TenantSubscription | null> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل بيانات الاشتراك',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionInfo = async (tenantId: string): Promise<SubscriptionInfo | null> => {
    try {
      const { data, error } = await supabase
        .rpc('get_tenant_subscription_info', { p_tenant_id: tenantId });

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل معلومات الاشتراك',
        variant: 'destructive',
      });
      return null;
    }
  };

  const checkIsActive = async (tenantId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('check_tenant_active', { p_tenant_id: tenantId });

      if (error) throw error;
      return data || false;
    } catch (err) {
      return false;
    }
  };

  const checkFeatureEnabled = async (tenantId: string, moduleCode: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('check_tenant_feature_enabled', {
          p_tenant_id: tenantId,
          p_module_code: moduleCode
        });

      if (error) throw error;
      return data || false;
    } catch (err) {
      return false;
    }
  };

  const changePlan = async (
    tenantId: string,
    newPlanId: string,
    changeReason: string,
    currentUserId: string
  ) => {
    try {
      setLoading(true);

      const oldTenant = await supabase
        .from('tenants')
        .select('plan_id, subscription_status, base_price')
        .eq('id', tenantId)
        .single();

      const newPlan = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', newPlanId)
        .single();

      if (oldTenant.error || newPlan.error) {
        throw new Error('Failed to fetch plan data');
      }

      const subscriptionEnds = new Date();
      subscriptionEnds.setMonth(subscriptionEnds.getMonth() + 1);

      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          plan_id: newPlanId,
          subscription_status: 'active',
          subscription_starts_at: new Date().toISOString(),
          subscription_ends_at: subscriptionEnds.toISOString(),
          base_price: newPlan.data.price_monthly,
          max_users: newPlan.data.included_users,
          max_assets: newPlan.data.included_assets,
          max_work_orders_per_month: newPlan.data.included_work_orders,
          max_storage_mb: newPlan.data.included_storage_mb,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      await supabase
        .from('subscription_history')
        .insert({
          tenant_id: tenantId,
          old_plan_id: oldTenant.data.plan_id,
          new_plan_id: newPlanId,
          old_status: oldTenant.data.subscription_status,
          new_status: 'active',
          old_price: oldTenant.data.base_price,
          new_price: newPlan.data.price_monthly,
          changed_by: currentUserId,
          change_reason: changeReason
        });

      toast({
        title: 'نجح',
        description: 'تم تغيير الخطة بنجاح',
      });

      return true;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تغيير الخطة',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionStatus = async (
    tenantId: string,
    newStatus: SubscriptionStatus,
    reason: string,
    currentUserId: string
  ) => {
    try {
      setLoading(true);

      const oldTenant = await supabase
        .from('tenants')
        .select('subscription_status')
        .eq('id', tenantId)
        .single();

      if (oldTenant.error) throw oldTenant.error;

      const updates: any = {
        subscription_status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'suspended') {
        updates.suspended_at = new Date().toISOString();
        updates.suspended_by = currentUserId;
        updates.suspension_reason = reason;
      } else if (newStatus === 'active') {
        updates.suspended_at = null;
        updates.suspended_by = null;
        updates.suspension_reason = null;
      }

      const { error: updateError } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenantId);

      if (updateError) throw updateError;

      await supabase
        .from('subscription_history')
        .insert({
          tenant_id: tenantId,
          old_status: oldTenant.data.subscription_status,
          new_status: newStatus,
          changed_by: currentUserId,
          change_reason: reason
        });

      toast({
        title: 'نجح',
        description: 'تم تحديث حالة الاشتراك بنجاح',
      });

      return true;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تحديث حالة الاشتراك',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const extendTrial = async (tenantId: string, days: number) => {
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('trial_ends_at')
        .eq('id', tenantId)
        .single();

      if (!tenant) throw new Error('Tenant not found');

      const currentEnd = new Date(tenant.trial_ends_at);
      const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('tenants')
        .update({
          trial_ends_at: newEnd.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (error) throw error;

      toast({
        title: 'نجح',
        description: `تم تمديد الفترة التجريبية ${days} يوم`,
      });

      return true;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تمديد الفترة التجريبية',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateTenantLimits = async (
    tenantId: string,
    limits: {
      max_users?: number;
      max_assets?: number;
      max_work_orders_per_month?: number;
      max_storage_mb?: number;
    }
  ) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          ...limits,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (error) throw error;

      toast({
        title: 'نجح',
        description: 'تم تحديث الحدود بنجاح',
      });

      return true;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تحديث الحدود',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getSubscriptionHistory = async (tenantId: string) => {
    try {
      const { data, error } = await supabase
        .from('subscription_history')
        .select(`
          *,
          old_plan:old_plan_id(name, name_ar),
          new_plan:new_plan_id(name, name_ar)
        `)
        .eq('tenant_id', tenantId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل سجل الاشتراكات',
        variant: 'destructive',
      });
      return [];
    }
  };

  return {
    loading,
    getTenantSubscription,
    getSubscriptionInfo,
    checkIsActive,
    checkFeatureEnabled,
    changePlan,
    updateSubscriptionStatus,
    extendTrial,
    updateTenantLimits,
    getSubscriptionHistory,
  };
};
