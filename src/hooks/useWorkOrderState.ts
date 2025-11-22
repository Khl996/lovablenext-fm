import { useMemo } from 'react';
import { getWorkOrderState, canTransition, getStatusDisplayName, getStatusColor } from '@/lib/workOrderStateMachine';
import type { Database } from '@/integrations/supabase/types';

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];

interface UseWorkOrderStateParams {
  workOrder: any;
  userRoles: string[];
  isReporter: boolean;
}

export function useWorkOrderState({ workOrder, userRoles, isReporter }: UseWorkOrderStateParams) {
  const state = useMemo(() => {
    if (!workOrder) return null;
    return getWorkOrderState(workOrder.status, userRoles, workOrder, isReporter);
  }, [workOrder, userRoles, isReporter]);

  const validateTransition = useMemo(() => {
    return (to: WorkOrderStatus) => {
      if (!workOrder || !state) return { valid: false, error: 'Invalid state' };
      return canTransition(workOrder.status, to, userRoles, workOrder, isReporter);
    };
  }, [workOrder, userRoles, isReporter, state]);

  const statusDisplay = useMemo(() => {
    if (!workOrder) return { name: '', nameAr: '', color: '' };
    return {
      name: getStatusDisplayName(workOrder.status, 'en'),
      nameAr: getStatusDisplayName(workOrder.status, 'ar'),
      color: getStatusColor(workOrder.status),
    };
  }, [workOrder]);

  // Calculate auto-close warning info
  const autoCloseInfo = useMemo(() => {
    if (!workOrder || workOrder.status !== 'pending_reporter_closure' || !workOrder.pending_closure_since) {
      return null;
    }

    const pendingSince = new Date(workOrder.pending_closure_since);
    const autoCloseTime = new Date(pendingSince.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const hoursRemaining = Math.max(0, Math.floor((autoCloseTime.getTime() - now.getTime()) / (1000 * 60 * 60)));

    return {
      hoursRemaining,
      willAutoClose: hoursRemaining < 24,
      autoCloseTime,
    };
  }, [workOrder]);

  return {
    state,
    validateTransition,
    statusDisplay,
    autoCloseInfo,
  };
}
