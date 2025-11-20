// Central types file for the application

// Work Order Types
export type WorkOrderStatus = 
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'pending_supervisor_approval'
  | 'pending_engineer_review'
  | 'pending_reporter_closure'
  | 'completed'
  | 'auto_closed'
  | 'cancelled';

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkOrder {
  id: string;
  code: string;
  description: string;
  issue_type: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  reported_at: string;
  reported_by: string;
  assigned_to: string | null;
  assigned_team: string | null;
  building_id: string | null;
  floor_id: string | null;
  department_id: string | null;
  room_id: string | null;
  asset_id: string | null;
  company_id: string | null;
  hospital_id: string;
  start_time: string | null;
  end_time: string | null;
  technician_completed_at: string | null;
  technician_notes: string | null;
  supervisor_approved_at: string | null;
  supervisor_approved_by: string | null;
  supervisor_notes: string | null;
  engineer_approved_at: string | null;
  engineer_approved_by: string | null;
  engineer_notes: string | null;
  customer_reviewed_at: string | null;
  customer_reviewed_by: string | null;
  reporter_notes: string | null;
  maintenance_manager_approved_at: string | null;
  maintenance_manager_approved_by: string | null;
  maintenance_manager_notes: string | null;
  auto_closed_at: string | null;
  pending_closure_since: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperationLog {
  id: string;
  code: string;
  type: string;
  asset_name: string;
  asset_id: string | null;
  location: string;
  system_type: string;
  reason: string;
  description: string | null;
  performed_by: string;
  technician_name: string;
  team: string | null;
  timestamp: string;
  status: string;
  category: string | null;
  hospital_id: string;
  related_work_order: string | null;
  start_time: string | null;
  end_time: string | null;
  estimated_duration: number | null;
  actual_duration: number | null;
  photos: string[] | null;
  notes: string | null;
  approval_required: boolean | null;
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  emergency_measures: string | null;
  affected_areas: string[] | null;
  notified_parties: string[] | null;
  previous_status: string | null;
  new_status: string | null;
  created_at: string;
}

export interface WorkOrderLocation {
  building?: { name: string; name_ar: string } | null;
  floor?: { name: string; name_ar: string } | null;
  department?: { name: string; name_ar: string } | null;
  room?: { name: string; name_ar: string } | null;
}

export interface WorkOrderAsset {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  model: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  status: string;
  category: string;
  qr_code: string | null;
}

// User Types
export interface Profile {
  id: string;
  full_name: string;
  full_name_ar: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  hospital_id: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: string;
  hospital_id: string | null;
  created_at: string;
}

export interface CustomUserRole {
  id: string;
  user_id: string;
  role_code: string;
  hospital_id: string | null;
  created_at: string;
}

// Maintenance Types
export interface MaintenancePlan {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  year: number;
  department: string | null;
  status: string;
  budget: number | null;
  budget_utilization: number | null;
  completion_rate: number | null;
  on_time_rate: number | null;
  quality_score: number | null;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceTask {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: 'preventive' | 'corrective' | 'predictive';
  status: string;
  frequency: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  progress: number | null;
  is_critical: boolean | null;
  plan_id: string;
  assigned_to: string | null;
  depends_on: string | null;
  checklist: any;
  created_at: string;
  updated_at: string;
}

// Asset Types
export interface Asset {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  category: string;
  subcategory: string | null;
  type: string | null;
  status: string;
  criticality: string;
  model: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  manufacture_year: number | null;
  installation_date: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  depreciation_annual: number | null;
  expected_lifespan_years: number | null;
  warranty_provider: string | null;
  warranty_expiry: string | null;
  supplier: string | null;
  specifications: any;
  qr_code: string | null;
  hospital_id: string;
  building_id: string | null;
  floor_id: string | null;
  department_id: string | null;
  room_id: string | null;
  parent_asset_id: string | null;
  coordinates_x: number | null;
  coordinates_y: number | null;
  created_at: string;
  updated_at: string;
}

// Hospital Structure Types
export interface Hospital {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: string | null;
  status: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  notes: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  description: string | null;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

export interface Floor {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  level: number;
  building_id: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  floor_id: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  department_id: string;
  coordinates_x: number | null;
  coordinates_y: number | null;
  created_at: string;
  updated_at: string;
}

// Team Types
export interface Team {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: string;
  department: string | null;
  status: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  specialization: string[] | null;
  certifications: any;
  created_at: string;
}

// Lookup Types
export interface LookupItem {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  hospital_id: string;
  is_active: boolean | null;
  display_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Priority extends LookupItem {
  level: number;
  color: string | null;
}

export interface WorkOrderStatusLookup extends LookupItem {
  category: string;
  color: string | null;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  title_ar: string;
  message: string;
  message_ar: string;
  related_task_id: string | null;
  is_read: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean | null;
  in_app_enabled: boolean | null;
  task_assignments: boolean | null;
  upcoming_tasks: boolean | null;
  overdue_tasks: boolean | null;
  task_completions: boolean | null;
  days_before_due: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// Common utility types
export interface TableFilters<T = any> {
  searchQuery: string;
  filters: Record<string, any>;
  sortBy?: keyof T;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}
