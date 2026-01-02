import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionPlan } from '@/types';
import { toast } from '@/hooks/use-toast';

export const useSubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlans = async (activeOnly = false) => {
    try {
      setLoading(true);
      let query = supabase
        .from('subscription_plans')
        .select('*')
        .order('display_order');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      setError(err as Error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الخطط',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanById = async (planId: string): Promise<SubscriptionPlan | null> => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل الخطة',
        variant: 'destructive',
      });
      return null;
    }
  };

  const createPlan = async (plan: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert(plan)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'نجح',
        description: 'تم إنشاء الخطة بنجاح',
      });

      await fetchPlans();
      return data;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل إنشاء الخطة',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updatePlan = async (planId: string, updates: Partial<SubscriptionPlan>) => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(updates)
        .eq('id', planId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'نجح',
        description: 'تم تحديث الخطة بنجاح',
      });

      await fetchPlans();
      return data;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل تحديث الخطة',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'نجح',
        description: 'تم حذف الخطة بنجاح',
      });

      await fetchPlans();
      return true;
    } catch (err) {
      toast({
        title: 'خطأ',
        description: 'فشل حذف الخطة',
        variant: 'destructive',
      });
      return false;
    }
  };

  const togglePlanStatus = async (planId: string, isActive: boolean) => {
    return await updatePlan(planId, { is_active: isActive });
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return {
    plans,
    loading,
    error,
    fetchPlans,
    getPlanById,
    createPlan,
    updatePlan,
    deletePlan,
    togglePlanStatus,
  };
};
