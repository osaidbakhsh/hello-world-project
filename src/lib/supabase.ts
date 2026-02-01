import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AppRole = 'super_admin' | 'admin' | 'employee';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: AppRole;
  department: string;
  position: string;
  phone: string | null;
  skills: string[];
  certifications: string[];
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Network {
  id: string;
  domain_id: string;
  name: string;
  subnet: string | null;
  gateway: string | null;
  dns_servers: string[] | null;
  description: string | null;
  created_at: string;
}

export interface Server {
  id: string;
  network_id: string | null;
  name: string;
  ip_address: string | null;
  operating_system: string | null;
  environment: string;
  status: string;
  owner: string | null;
  responsible_user: string | null;
  disk_space: string | null;
  ram: string | null;
  cpu: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Lifecycle & DR fields
  warranty_end: string | null;
  eol_date: string | null;
  eos_date: string | null;
  vendor: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  support_level: string | null;
  contract_id: string | null;
  // Backup fields
  is_backed_up_by_veeam: boolean | null;
  backup_frequency: string | null;
  backup_job_name: string | null;
  last_backup_date: string | null;
  last_backup_status: string | null;
  last_restore_test: string | null;
  rpo_hours: number | null;
  rto_hours: number | null;
  // Additional fields
  server_role: string[] | null;
  primary_application: string | null;
  beneficiary_department: string | null;
  business_owner: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  server_id: string | null;
  assigned_to: string | null;
  priority: string;
  status: string;
  frequency: string;
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Linked entities
  linked_server_id: string | null;
  linked_network_id: string | null;
  linked_license_id: string | null;
  // Additional fields
  task_status: string | null;
  sla_response_hours: number | null;
  sla_resolve_hours: number | null;
  sla_breached: boolean | null;
  parent_task_id: string | null;
  requester_id: string | null;
  reviewer_id: string | null;
  watchers: string[] | null;
  checklist: any | null;
  evidence: any | null;
}

export interface Vacation {
  id: string;
  profile_id: string;
  vacation_type: string;
  start_date: string;
  end_date: string;
  days_count: number | null;
  status: string;
  notes: string | null;
  approved_by: string | null;
  created_at: string;
}

export interface EmployeeReport {
  id: string;
  profile_id: string;
  report_date: string;
  report_type: string;
  file_name: string | null;
  file_url: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface License {
  id: string;
  domain_id: string | null;
  name: string;
  vendor: string | null;
  license_key: string | null;
  purchase_date: string | null;
  expiry_date: string | null;
  quantity: number;
  assigned_to: string | null;
  cost: number | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface YearlyGoal {
  id: string;
  profile_id: string;
  year: number;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  created_at: string;
}

export interface DomainMembership {
  id: string;
  profile_id: string;
  domain_id: string;
  can_edit: boolean;
  created_at: string;
}
