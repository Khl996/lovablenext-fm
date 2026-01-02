import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TenantUsage } from '@/types';
import { toast } from '@/hooks/use-toast';

export type UsageLimitType = 'users' | 'assets' | 'work_orders' | 'storage';

export interface UsageLimit {
  canAdd: boolean;
  current: number;
  max: number | null;
  remaining: number | null;
  percentage: number;
}

export const useTenantUsage = (tenantId: string) => {
  const [loading, setLoading] = useState(false);

  const calculateUsage = async (): Promise<TenantUsage | null> => {
    try {
      const { data, error } = await supabase
        .rpc('calculate_tenant_usage', { p_tenant_id: tenantId });

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل حساب الاستخدام',
        variant: 'destructive',
      });
      return null;
    }
  };

  const checkLimit = async (limitType: UsageLimitType): Promise<UsageLimit> => {
    try {
      setLoading(true);

      const usage = await calculateUsage();
      if (!usage) {
        return {
          canAdd: false,
          current: 0,
          max: 0,
          remaining: 0,
          percentage: 0
        };
      }

      let currentUsage = 0;
      let limitField = '';

      switch (limitType) {
        case 'users':
          currentUsage = usage.users_count;
          limitField = 'max_users';
          break;
        case 'assets':
          currentUsage = usage.assets_count;
          limitField = 'max_assets';
          break;
        case 'work_orders':
          currentUsage = usage.work_orders_this_month;
          limitField = 'max_work_orders_per_month';
          break;
        case 'storage':
          currentUsage = usage.storage_used_mb;
          limitField = 'max_storage_mb';
          break;
      }

      const { data: canAdd } = await supabase
        .rpc('check_tenant_usage_limit', {
          p_tenant_id: tenantId,
          p_limit_type: limitType,
          p_current_usage: currentUsage
        });

      const { data: tenant } = await supabase
        .from('tenants')
        .select(limitField)
        .eq('id', tenantId)
        .single();

      const maxLimit = tenant?.[limitField] || null;
      const remaining = maxLimit ? maxLimit - currentUsage : null;
      const percentage = maxLimit ? (currentUsage / maxLimit) * 100 : 0;

      return {
        canAdd: canAdd || false,
        current: currentUsage,
        max: maxLimit,
        remaining,
        percentage
      };
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل فحص الحد',
        variant: 'destructive',
      });
      return {
        canAdd: false,
        current: 0,
        max: 0,
        remaining: 0,
        percentage: 0
      };
    } finally {
      setLoading(false);
    }
  };

  const getAllLimits = async () => {
    try {
      const [usersLimit, assetsLimit, workOrdersLimit, storageLimit] = await Promise.all([
        checkLimit('users'),
        checkLimit('assets'),
        checkLimit('work_orders'),
        checkLimit('storage')
      ]);

      return {
        users: usersLimit,
        assets: assetsLimit,
        work_orders: workOrdersLimit,
        storage: storageLimit
      };
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الحدود',
        variant: 'destructive',
      });
      return null;
    }
  };

  const checkCanAdd = async (limitType: UsageLimitType): Promise<boolean> => {
    const limit = await checkLimit(limitType);
    return limit.canAdd;
  };

  return {
    loading,
    calculateUsage,
    checkLimit,
    getAllLimits,
    checkCanAdd
  };
};
