import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { handleApiError, handleSuccess } from '@/lib/errorHandler';

interface WorkOrderActionParams {
  workOrderId: string;
  notes?: string;
  rejectStage?: string;
}

const RATE_LIMIT_WINDOW = 2000; // 2 seconds between actions

export function useWorkOrderActions(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();
  const lastActionTime = useRef<number>(0);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    if (now - lastActionTime.current < RATE_LIMIT_WINDOW) {
      toast({
        title: language === 'ar' ? 'تنبيه' : 'Warning',
        description: language === 'ar' 
          ? 'يرجى الانتظار قبل تنفيذ إجراء آخر'
          : 'Please wait before performing another action',
        variant: 'destructive',
      });
      return false;
    }
    lastActionTime.current = now;
    return true;
  }, [language, toast]);

  const sendNotification = useCallback(async (workOrderId: string, eventType: string, extra?: any) => {
    try {
      await supabase.functions.invoke('send-work-order-email', {
        body: { workOrderId, eventType, ...extra },
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }, []);

  const startWork = useCallback(async ({ workOrderId }: WorkOrderActionParams) => {
    if (!checkRateLimit()) return;
    
    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_start_work', {
        _work_order_id: workOrderId,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'work_started');
      handleSuccess(language === 'ar' ? 'تم بدء العمل' : 'Work started', toast, language);
      onSuccess?.();
    } catch (error: any) {
      handleApiError(error, toast, language);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, toast, onSuccess, checkRateLimit]);

  const completeWork = useCallback(async ({ workOrderId, notes }: WorkOrderActionParams) => {
    if (!notes?.trim()) {
      handleApiError(
        { message: language === 'ar' ? 'يرجى إضافة ملاحظات' : 'Please add notes' },
        toast,
        language
      );
      return;
    }

    if (!checkRateLimit()) return;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_complete_work', {
        _work_order_id: workOrderId,
        _technician_notes: notes,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'work_completed');
      handleSuccess(language === 'ar' ? 'تم إكمال العمل بنجاح' : 'Work completed successfully', toast, language);
      onSuccess?.();
    } catch (error: any) {
      handleApiError(error, toast, language);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, toast, onSuccess, checkRateLimit]);

  const approveAsSupervisor = useCallback(async ({ workOrderId, notes }: WorkOrderActionParams) => {
    if (!notes?.trim()) {
      handleApiError(
        { message: language === 'ar' ? 'يرجى إضافة ملاحظات' : 'Please add notes' },
        toast,
        language
      );
      return;
    }

    if (!checkRateLimit()) return;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_supervisor_approve', {
        _work_order_id: workOrderId,
        _supervisor_notes: notes,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'supervisor_approved');
      handleSuccess(language === 'ar' ? 'تم اعتماد البلاغ' : 'Work order approved', toast, language);
      onSuccess?.();
    } catch (error: any) {
      handleApiError(error, toast, language);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, toast, onSuccess, checkRateLimit]);

  const reviewAsEngineer = useCallback(async ({ workOrderId, notes }: WorkOrderActionParams) => {
    if (!notes?.trim()) {
      handleApiError(
        { message: language === 'ar' ? 'يرجى إضافة ملاحظات' : 'Please add notes' },
        toast,
        language
      );
      return;
    }

    if (!checkRateLimit()) return;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_engineer_review', {
        _work_order_id: workOrderId,
        _engineer_notes: notes,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'engineer_approved');
      handleSuccess(language === 'ar' ? 'تمت المراجعة بنجاح' : 'Review completed successfully', toast, language);
      onSuccess?.();
    } catch (error: any) {
      handleApiError(error, toast, language);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, toast, onSuccess, checkRateLimit]);

  const closeAsReporter = useCallback(async ({ workOrderId, notes = '' }: WorkOrderActionParams) => {
    if (!checkRateLimit()) return;
    
    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_reporter_closure', {
        _work_order_id: workOrderId,
        _reporter_notes: notes,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'customer_reviewed');
      handleSuccess(language === 'ar' ? 'تم إغلاق البلاغ' : 'Work order closed', toast, language);
      onSuccess?.();
    } catch (error: any) {
      handleApiError(error, toast, language);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, toast, onSuccess, checkRateLimit]);

  const finalApprove = useCallback(async ({ workOrderId, notes }: WorkOrderActionParams) => {
    if (!notes?.trim()) {
      handleApiError(
        { message: language === 'ar' ? 'يرجى إضافة ملاحظات' : 'Please add notes' },
        toast,
        language
      );
      return;
    }

    if (!checkRateLimit()) return;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_final_approve', {
        _work_order_id: workOrderId,
        _manager_notes: notes,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'final_approved');
      handleSuccess(language === 'ar' ? 'تم الاعتماد النهائي' : 'Final approval completed', toast, language);
      onSuccess?.();
    } catch (error: any) {
      handleApiError(error, toast, language);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, toast, onSuccess, checkRateLimit]);

  const reject = useCallback(async ({ workOrderId, notes, rejectStage }: WorkOrderActionParams) => {
    if (!notes?.trim()) {
      handleApiError(
        { message: language === 'ar' ? 'يرجى إضافة سبب الرفض' : 'Please add rejection reason' },
        toast,
        language
      );
      return;
    }

    if (!rejectStage) {
      handleApiError(
        { message: language === 'ar' ? 'مرحلة الرفض غير محددة' : 'Rejection stage not specified' },
        toast,
        language
      );
      return;
    }

    if (!checkRateLimit()) return;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_reject', {
        _work_order_id: workOrderId,
        _rejection_reason: notes,
        _rejection_stage: rejectStage,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'rejected', { rejectionStage: rejectStage });
      handleSuccess(language === 'ar' ? 'تم رفض أمر العمل وإرجاعه' : 'Work order rejected and returned', toast, language);
      onSuccess?.();
    } catch (error: any) {
      handleApiError(error, toast, language);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, toast, onSuccess, checkRateLimit]);

  return {
    loading,
    startWork,
    completeWork,
    approveAsSupervisor,
    reviewAsEngineer,
    closeAsReporter,
    finalApprove,
    reject,
  };
}
