export type WorkOrderStatus = 
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'pending_supervisor_approval'
  | 'pending_engineer_review'
  | 'pending_reporter_closure'
  | 'completed'
  | 'cancelled'
  | 'auto_closed'
  | 'rejected_by_technician'
  | 'rejected_by_supervisor'
  | 'rejected_by_engineer'
  | 'needs_redirection'
  | 'awaiting_approval'
  | 'customer_approved'
  | 'customer_rejected';

export type WorkOrder = {
  id: string;
  code: string;
  issue_type: string;
  description: string;
  status: WorkOrderStatus;
  priority: string;
  urgency: string | null;
  reported_at: string;
  reported_by: string;
  assigned_to: string | null;
  assigned_team: string | null;
  asset_id: string | null;
  building_id: string | null;
  floor_id: string | null;
  department_id: string | null;
  room_id: string | null;
  work_notes: string | null;
  supervisor_notes: string | null;
  customer_feedback: string | null;
  customer_rating: number | null;
  start_time: string | null;
  technician_completed_at: string | null;
  technician_notes: string | null;
  supervisor_approved_by: string | null;
  supervisor_approved_at: string | null;
  engineer_approved_by: string | null;
  engineer_approved_at: string | null;
  engineer_notes: string | null;
  customer_reviewed_by: string | null;
  customer_reviewed_at: string | null;
  reporter_notes: string | null;
  auto_closed_at: string | null;
  maintenance_manager_approved_by: string | null;
  maintenance_manager_approved_at: string | null;
  maintenance_manager_notes: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_stage: string | null;
  rejection_reason: string | null;
  pending_closure_since: string | null;
};

export type OperationLog = {
  id: string;
  timestamp: string;
  performed_by: string;
  type: string;
  description: string;
  notes: string | null;
};

export type WorkOrderLocation = {
  building?: { name: string; name_ar: string } | null;
  floor?: { name: string; name_ar: string } | null;
  department?: { name: string; name_ar: string } | null;
  room?: { name: string; name_ar: string } | null;
};

export type WorkOrderAsset = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  serial_number: string | null;
  model: string | null;
  buildings?: { name: string; name_ar: string } | null;
  floors?: { name: string; name_ar: string } | null;
  departments?: { name: string; name_ar: string } | null;
  rooms?: { name: string; name_ar: string } | null;
};
