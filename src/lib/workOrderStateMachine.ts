/**
 * Work Order State Machine
 * Centralized workflow management for work orders
 * Ensures proper state transitions and role-based actions
 */

import type { Database } from '@/integrations/supabase/types';

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];

export interface WorkOrderState {
  status: WorkOrderStatus;
  can: {
    start: boolean;
    complete: boolean;
    approve: boolean;
    review: boolean;
    close: boolean;
    reject: boolean;
    reassign: boolean;
    update: boolean;
  };
  nextStatus?: WorkOrderStatus;
  requiredRole?: string[];
  requiredFields?: string[];
}

export interface WorkOrderTransition {
  from: WorkOrderStatus;
  to: WorkOrderStatus;
  action: string;
  requiredRole: string[];
  requiredFields?: string[];
  validation?: (workOrder: any) => { valid: boolean; error?: string };
}

/**
 * Valid state transitions for work orders
 */
export const WORK_ORDER_TRANSITIONS: WorkOrderTransition[] = [
  // Technician starts work (initial status pending or assigned)
  {
    from: 'pending',
    to: 'in_progress',
    action: 'start_work',
    requiredRole: ['technician', 'senior_technician'],
    validation: (wo) => {
      if (wo.start_time) {
        return { valid: false, error: 'Work already started' };
      }
      return { valid: true };
    },
  },
  {
    from: 'assigned',
    to: 'in_progress',
    action: 'start_work',
    requiredRole: ['technician', 'senior_technician'],
    validation: (wo) => {
      if (wo.start_time) {
        return { valid: false, error: 'Work already started' };
      }
      return { valid: true };
    },
  },
  
  // Technician completes work
  {
    from: 'in_progress',
    to: 'pending_supervisor_approval',
    action: 'complete_work',
    requiredRole: ['technician', 'senior_technician'],
    requiredFields: ['technician_notes'],
    validation: (wo) => {
      if (!wo.start_time) {
        return { valid: false, error: 'Work must be started first' };
      }
      if (wo.technician_completed_at) {
        return { valid: false, error: 'Work already completed' };
      }
      return { valid: true };
    },
  },
  
  // Supervisor approves
  {
    from: 'pending_supervisor_approval',
    to: 'pending_engineer_review',
    action: 'supervisor_approve',
    requiredRole: ['supervisor', 'facility_manager', 'hospital_admin'],
    requiredFields: ['supervisor_notes'],
    validation: (wo) => {
      if (!wo.technician_completed_at) {
        return { valid: false, error: 'Technician must complete work first' };
      }
      if (wo.supervisor_approved_at) {
        return { valid: false, error: 'Already approved by supervisor' };
      }
      return { valid: true };
    },
  },
  
  // Engineer reviews
  {
    from: 'pending_engineer_review',
    to: 'pending_reporter_closure',
    action: 'engineer_review',
    requiredRole: ['engineer', 'maintenance_manager', 'facility_manager', 'hospital_admin'],
    requiredFields: ['engineer_notes'],
    validation: (wo) => {
      if (!wo.supervisor_approved_at) {
        return { valid: false, error: 'Must be approved by supervisor first' };
      }
      if (wo.engineer_approved_at) {
        return { valid: false, error: 'Already reviewed by engineer' };
      }
      return { valid: true };
    },
  },
  
  // Reporter closes
  {
    from: 'pending_reporter_closure',
    to: 'completed',
    action: 'reporter_close',
    requiredRole: ['reporter'],
    // Reporter notes are optional - closure can happen without notes
    validation: (wo) => {
      if (!wo.engineer_approved_at) {
        return { valid: false, error: 'Must be reviewed by engineer first' };
      }
      if (wo.customer_reviewed_at) {
        return { valid: false, error: 'Already closed by reporter' };
      }
      return { valid: true };
    },
  },
  
  // Rejections
  // Technician can reject from assigned (before starting work) -> goes to rejected_by_technician
  {
    from: 'assigned',
    to: 'rejected_by_technician',
    action: 'reject_technician',
    requiredRole: ['technician', 'senior_technician'],
    requiredFields: ['rejection_reason'],
  },
  // Technician can reject from in_progress (after starting work) -> goes to rejected_by_technician
  {
    from: 'in_progress',
    to: 'rejected_by_technician',
    action: 'reject_technician',
    requiredRole: ['technician', 'senior_technician'],
    requiredFields: ['rejection_reason'],
  },
  {
    from: 'pending_supervisor_approval',
    to: 'in_progress',
    action: 'reject_supervisor',
    requiredRole: ['supervisor', 'facility_manager', 'hospital_admin'],
    requiredFields: ['rejection_reason'],
  },
  {
    from: 'pending_engineer_review',
    to: 'pending_supervisor_approval',
    action: 'reject_engineer',
    requiredRole: ['engineer', 'maintenance_manager', 'facility_manager', 'hospital_admin'],
    requiredFields: ['rejection_reason'],
  },
  // Reporter can reject and return to engineer
  {
    from: 'pending_reporter_closure',
    to: 'pending_engineer_review',
    action: 'reject_reporter',
    requiredRole: ['reporter'],
    requiredFields: ['rejection_reason'],
    validation: (wo) => {
      if (!wo.engineer_approved_at) {
        return { valid: false, error: 'Must be reviewed by engineer first' };
      }
      return { valid: true };
    },
  },
];

/**
 * Get available actions for a work order based on current status and user role
 */
export function getWorkOrderState(
  status: WorkOrderStatus,
  userRoles: string[],
  workOrder: any,
  isReporter: boolean
): WorkOrderState {
  const state: WorkOrderState = {
    status,
    can: {
      start: false,
      complete: false,
      approve: false,
      review: false,
      close: false,
      reject: false,
      reassign: false,
      update: false,
    },
  };

  // Find available transitions
  const availableTransitions = WORK_ORDER_TRANSITIONS.filter((t) => {
    if (t.from !== status) return false;
    
    // Check if user has required role
    const hasRole = t.requiredRole.some((role) => userRoles.includes(role));
    if (!hasRole && !(isReporter && t.requiredRole.includes('reporter'))) return false;
    
    // Run validation if exists
    if (t.validation) {
      const result = t.validation(workOrder);
      if (!result.valid) return false;
    }
    
    return true;
  });

  // Set capabilities based on available transitions
  availableTransitions.forEach((t) => {
    switch (t.action) {
      case 'start_work':
        state.can.start = true;
        state.nextStatus = t.to;
        break;
      case 'complete_work':
        state.can.complete = true;
        state.nextStatus = t.to;
        break;
      case 'supervisor_approve':
        state.can.approve = true;
        state.nextStatus = t.to;
        break;
      case 'engineer_review':
        state.can.review = true;
        state.nextStatus = t.to;
        break;
      case 'reporter_close':
        state.can.close = true;
        state.nextStatus = t.to;
        break;
      case 'reject_technician':
      case 'reject_supervisor':
      case 'reject_engineer':
      case 'reject_reporter':
        state.can.reject = true;
        break;
    }
  });

  // Reassign and update are available for managers (including engineers)
  const isManager = userRoles.some((role) =>
    ['engineer', 'supervisor', 'facility_manager', 'hospital_admin', 'maintenance_manager'].includes(role)
  );
  
  if (isManager) {
    // Supervisor can reassign from rejected_by_technician status as well
    state.can.reassign = ['pending', 'assigned', 'in_progress', 'rejected_by_technician'].includes(status);
    state.can.update = true;
  }

  return state;
}

/**
 * Validate a state transition
 */
export function canTransition(
  from: WorkOrderStatus,
  to: WorkOrderStatus,
  userRoles: string[],
  workOrder: any,
  isReporter: boolean = false
): { valid: boolean; error?: string; transition?: WorkOrderTransition } {
  const transition = WORK_ORDER_TRANSITIONS.find((t) => t.from === from && t.to === to);
  
  if (!transition) {
    return { valid: false, error: 'Invalid state transition' };
  }

  // Check role
  const hasRole = transition.requiredRole.some((role) => userRoles.includes(role));
  if (!hasRole && !(isReporter && transition.requiredRole.includes('reporter'))) {
    return { valid: false, error: 'User does not have required role for this action' };
  }

  // Run validation
  if (transition.validation) {
    const result = transition.validation(workOrder);
    if (!result.valid) {
      return { valid: false, error: result.error };
    }
  }

  return { valid: true, transition };
}

/**
 * Get status display name
 */
export function getStatusDisplayName(status: WorkOrderStatus, language: 'en' | 'ar'): string {
  const statusNames: Record<WorkOrderStatus, { en: string; ar: string }> = {
    pending: { en: 'Pending', ar: 'قيد الانتظار' },
    assigned: { en: 'Assigned', ar: 'معين' },
    in_progress: { en: 'In Progress', ar: 'جاري العمل' },
    needs_redirection: { en: 'Needs Redirection', ar: 'يحتاج إعادة توجيه' },
    awaiting_approval: { en: 'Awaiting Approval', ar: 'في انتظار الموافقة' },
    customer_approved: { en: 'Customer Approved', ar: 'تمت الموافقة من العميل' },
    customer_rejected: { en: 'Customer Rejected', ar: 'تم الرفض من العميل' },
    pending_supervisor_approval: { en: 'Pending Supervisor', ar: 'في انتظار المشرف' },
    pending_engineer_review: { en: 'Pending Engineer', ar: 'في انتظار المهندس' },
    pending_reporter_closure: { en: 'Pending Closure', ar: 'في انتظار الإغلاق' },
    rejected_by_technician: { en: 'Rejected by Technician', ar: 'تم الرفض من الفني' },
    completed: { en: 'Completed', ar: 'مكتمل' },
    auto_closed: { en: 'Auto Closed', ar: 'مغلق تلقائيًا' },
    cancelled: { en: 'Cancelled', ar: 'ملغي' },
  };

  return statusNames[status]?.[language] || status;
}

/**
 * Get status color for badges using semantic tokens
 */
export function getStatusColor(status: WorkOrderStatus): string {
  const colors: Record<WorkOrderStatus, string> = {
    pending: 'bg-warning',
    assigned: 'bg-info',
    in_progress: 'bg-primary',
    needs_redirection: 'bg-warning',
    awaiting_approval: 'bg-info',
    customer_approved: 'bg-success',
    customer_rejected: 'bg-destructive',
    pending_supervisor_approval: 'bg-warning',
    pending_engineer_review: 'bg-info',
    pending_reporter_closure: 'bg-warning',
    rejected_by_technician: 'bg-destructive',
    completed: 'bg-success',
    auto_closed: 'bg-muted',
    cancelled: 'bg-destructive',
  };

  return colors[status] || 'bg-muted';
}
