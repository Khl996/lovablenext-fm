import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface WorkOrderActionParams {
  workOrderId: string;
  notes?: string;
  rejectStage?: string;
}

export function useWorkOrderActions(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  const showError = useCallback((error: any) => {
    toast({
      title: language === 'ar' ? 'خطأ' : 'Error',
      description: error.message || (language === 'ar' ? 'حدث خطأ' : 'An error occurred'),
      variant: 'destructive',
    });
  }, [toast, language]);

  const showSuccess = useCallback((message: string) => {
    toast({
      title: language === 'ar' ? 'تم بنجاح' : 'Success',
      description: message,
    });
  }, [toast, language]);

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
    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_start_work', {
        _work_order_id: workOrderId,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'work_started');
      showSuccess(language === 'ar' ? 'تم بدء العمل' : 'Work started');
      onSuccess?.();
    } catch (error: any) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, showSuccess, showError, onSuccess]);

  const completeWork = useCallback(async ({ workOrderId, notes }: WorkOrderActionParams) => {
    if (!notes?.trim()) {
      showError({ message: language === 'ar' ? 'يرجى إضافة ملاحظات' : 'Please add notes' });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_complete_work', {
        _work_order_id: workOrderId,
        _technician_notes: notes,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'work_completed');
      showSuccess(language === 'ar' ? 'تم إكمال العمل بنجاح' : 'Work completed successfully');
      onSuccess?.();
    } catch (error: any) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, showSuccess, showError, onSuccess]);

  const approveAsSupervisor = useCallback(async ({ workOrderId, notes }: WorkOrderActionParams) => {
    if (!notes?.trim()) {
      showError({ message: language === 'ar' ? 'يرجى إضافة ملاحظات' : 'Please add notes' });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_supervisor_approve', {
        _work_order_id: workOrderId,
        _supervisor_notes: notes,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'supervisor_approved');
      showSuccess(language === 'ar' ? 'تم اعتماد البلاغ' : 'Work order approved');
      onSuccess?.();
    } catch (error: any) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, showSuccess, showError, onSuccess]);

  const reviewAsEngineer = useCallback(async ({ workOrderId, notes }: WorkOrderActionParams) => {
    if (!notes?.trim()) {
      showError({ message: language === 'ar' ? 'يرجى إضافة ملاحظات' : 'Please add notes' });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_engineer_review', {
        _work_order_id: workOrderId,
        _engineer_notes: notes,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'engineer_approved');
      showSuccess(language === 'ar' ? 'تمت المراجعة بنجاح' : 'Review completed successfully');
      onSuccess?.();
    } catch (error: any) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, showSuccess, showError, onSuccess]);

  const closeAsReporter = useCallback(async ({ workOrderId, notes = '' }: WorkOrderActionParams) => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_reporter_closure', {
        _work_order_id: workOrderId,
        _reporter_notes: notes,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'customer_reviewed');
      showSuccess(language === 'ar' ? 'تم إغلاق البلاغ' : 'Work order closed');
      onSuccess?.();
    } catch (error: any) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, showSuccess, showError, onSuccess]);

  const finalApprove = useCallback(async ({ workOrderId, notes }: WorkOrderActionParams) => {
    if (!notes?.trim()) {
      showError({ message: language === 'ar' ? 'يرجى إضافة ملاحظات' : 'Please add notes' });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_final_approve', {
        _work_order_id: workOrderId,
        _manager_notes: notes,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'final_approved');
      showSuccess(language === 'ar' ? 'تم الاعتماد النهائي' : 'Final approval completed');
      onSuccess?.();
    } catch (error: any) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, showSuccess, showError, onSuccess]);

  const reject = useCallback(async ({ workOrderId, notes, rejectStage }: WorkOrderActionParams) => {
    if (!notes?.trim()) {
      showError({ message: language === 'ar' ? 'يرجى إضافة سبب الرفض' : 'Please add rejection reason' });
      return;
    }

    if (!rejectStage) {
      showError({ message: language === 'ar' ? 'مرحلة الرفض غير محددة' : 'Rejection stage not specified' });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.rpc('work_order_reject', {
        _work_order_id: workOrderId,
        _rejection_reason: notes,
        _rejection_stage: rejectStage,
      });

      if (error) throw error;

      await sendNotification(workOrderId, 'rejected', { rejectionStage: rejectStage });
      showSuccess(language === 'ar' ? 'تم رفض أمر العمل وإرجاعه' : 'Work order rejected and returned');
      onSuccess?.();
    } catch (error: any) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [language, sendNotification, showSuccess, showError, onSuccess]);

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
