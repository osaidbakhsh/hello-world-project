// Type definitions for Supabase tables
// These are convenience types matching the database schema

export type AppRole = 'super_admin' | 'admin' | 'employee';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: AppRole;
  department: string | null;
  position: string | null;
  phone: string | null;
  skills: string[];
  certifications: string[];
  created_at: string;
  updated_at: string;
}

export type SiteRole = 'site_admin' | 'site_operator' | 'site_viewer';

export interface Site {
  id: string;
  name: string;
  code: string;
  city: string | null;
  region: string | null;
  timezone: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteMembership {
  id: string;
  site_id: string;
  profile_id: string;
  site_role: SiteRole;
  created_at: string;
}

export interface Domain {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  site_id: string;
  created_at: string;
}

export interface Network {
  id: string;
  domain_id: string;
  cluster_id: string;
  name: string;
  subnet: string | null;
  gateway: string | null;
  dns_servers: string[] | null;
  description: string | null;
  created_at: string;
}

export interface Server {
  id: string;
  network_id: string; // Required - linked to networks table
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
  can_edit: boolean | null;
  domain_role: string | null;
  created_at: string | null;
}

// Config types
export interface LdapConfig {
  id: string;
  domain_id: string;
  name: string;
  host: string;
  port: number;
  use_tls: boolean;
  base_dn: string | null;
  bind_dn: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NtpConfig {
  id: string;
  domain_id: string;
  name: string;
  servers: string[];
  sync_interval_seconds: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MailConfig {
  id: string;
  domain_id: string;
  name: string;
  smtp_host: string;
  smtp_port: number;
  use_tls: boolean;
  from_email: string | null;
  from_name: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectionTestRun {
  id: string;
  domain_id: string;
  module: 'ldap' | 'ntp' | 'mail' | 'fileshare' | 'agent' | 'storage';
  ldap_config_id: string | null;
  ntp_config_id: string | null;
  mail_config_id: string | null;
  fileshare_id: string | null;
  requested_by: string | null;
  status: 'success' | 'fail' | 'validation_only';
  latency_ms: number | null;
  message: string | null;
  error_details: any | null;
  created_at: string;
}

export interface SystemHealthCheck {
  id: string;
  check_type: 'auth' | 'db' | 'storage' | 'realtime';
  status: 'success' | 'fail';
  latency_ms: number | null;
  error_message: string | null;
  error_details: any | null;
  checked_by: string | null;
  created_at: string;
}

export interface ReportUpload {
  id: string;
  domain_id: string | null;
  employee_id: string | null;
  uploaded_by: string | null;
  file_path: string;
  original_filename: string;
  version: number;
  imported_rows: number;
  rejected_rows: number;
  import_summary: any | null;
  created_at: string;
}

export interface ReportUploadRow {
  id: string;
  report_upload_id: string;
  row_number: number;
  status: 'accepted' | 'rejected';
  errors: string[] | null;
  payload: any | null;
  created_at: string;
}
