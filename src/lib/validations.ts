import { z } from 'zod';

// ================== PATTERNS ==================

// IPv4 validation pattern
const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// IPv6 basic validation pattern
const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$/;

// CIDR notation pattern (IPv4)
const cidrPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;

// MAC address pattern (supports both : and - separators)
const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

// Hostname validation pattern (RFC 1123)
const hostnamePattern = /^(?=.{1,253}$)(?:(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)*(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/;

// DN (Distinguished Name) basic validation for LDAP
const dnPattern = /^(([A-Za-z]+=[^,]+),?)+$/;

// Email validation
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// URL validation pattern
const urlPattern = /^https?:\/\/[^\s]+$/;

// File share path patterns
const smbPathPattern = /^\\\\[^\\]+\\[^\\].*$/;
const nfsPathPattern = /^\/[^\/].*$/;

// ================== BASE SCHEMAS ==================

export const ipv4Schema = z.string().regex(ipv4Pattern, 'Invalid IPv4 address');

export const ipv4OptionalSchema = z.string()
  .optional()
  .nullable()
  .refine((val) => !val || ipv4Pattern.test(val), 'Invalid IPv4 address');

export const ipv6OptionalSchema = z.string()
  .optional()
  .nullable()
  .refine((val) => !val || ipv6Pattern.test(val), 'Invalid IPv6 address');

export const ipAddressOptionalSchema = z.string()
  .optional()
  .nullable()
  .refine((val) => !val || ipv4Pattern.test(val) || ipv6Pattern.test(val), 'Invalid IP address');

export const cidrSchema = z.string().regex(cidrPattern, 'Invalid CIDR format (e.g., 192.168.1.0/24)');

export const cidrOptionalSchema = z.string()
  .optional()
  .nullable()
  .refine((val) => !val || cidrPattern.test(val), 'Invalid CIDR format (e.g., 192.168.1.0/24)');

export const macAddressSchema = z.string().regex(macPattern, 'Invalid MAC address (e.g., 00:1A:2B:3C:4D:5E)');

export const macAddressOptionalSchema = z.string()
  .optional()
  .nullable()
  .refine((val) => !val || macPattern.test(val), 'Invalid MAC address');

// Port schemas
export const portSchema = z.number()
  .int('Port must be an integer')
  .min(1, 'Port must be at least 1')
  .max(65535, 'Port must be at most 65535');

export const portCoerceSchema = z.coerce.number()
  .int('Port must be an integer')
  .min(1, 'Port must be at least 1')
  .max(65535, 'Port must be at most 65535');

export const portStringSchema = z.string()
  .refine((val) => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num >= 1 && num <= 65535;
  }, 'Port must be a number between 1 and 65535');

// Number schemas
export const positiveIntCoerceSchema = z.coerce.number()
  .int('Must be a whole number')
  .min(0, 'Must be 0 or greater');

export const positiveIntOptionalSchema = z.coerce.number()
  .int('Must be a whole number')
  .min(0, 'Must be 0 or greater')
  .optional()
  .nullable();

export const positiveNumberOptionalSchema = z.coerce.number()
  .min(0, 'Must be 0 or greater')
  .optional()
  .nullable();

export const hostnameSchema = z.string()
  .min(1, 'Hostname is required')
  .refine((val) => hostnamePattern.test(val) || ipv4Pattern.test(val), 'Invalid hostname or IP address');

export const dnSchema = z.string()
  .optional()
  .nullable()
  .refine((val) => !val || dnPattern.test(val), 'Invalid Distinguished Name format');

export const emailSchema = z.string()
  .optional()
  .nullable()
  .refine((val) => !val || emailPattern.test(val), 'Invalid email address');

export const emailRequiredSchema = z.string()
  .min(1, 'Email is required')
  .refine((val) => emailPattern.test(val), 'Invalid email address');

export const urlOptionalSchema = z.string()
  .optional()
  .nullable()
  .refine((val) => !val || urlPattern.test(val), 'Invalid URL format');

export const urlRequiredSchema = z.string()
  .min(1, 'URL is required')
  .refine((val) => urlPattern.test(val), 'Invalid URL format');

// ================== FEATURE SCHEMAS ==================

// Server form schema
export const serverFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  ip_address: ipv4OptionalSchema,
  hostname: z.string().max(253, 'Hostname too long').optional().nullable(),
  operating_system: z.string().optional().nullable(),
  environment: z.string().optional().default('production'),
  status: z.string().optional().default('active'),
  owner: z.string().max(100, 'Owner must be less than 100 characters').optional().nullable(),
  responsible_user: z.string().optional().nullable(),
  disk_space: z.string().optional().nullable(),
  ram: z.string().optional().nullable(),
  cpu: z.string().optional().nullable(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional().nullable(),
  network_id: z.string().uuid().optional().nullable(),
  domain_id: z.string().uuid().optional().nullable(),
  source: z.enum(['manual', 'scan', 'import']).optional().default('manual'),
  // Lifecycle dates
  warranty_end: z.string().optional().nullable(),
  eol_date: z.string().optional().nullable(),
  eos_date: z.string().optional().nullable(),
  rpo_hours: z.coerce.number().int().min(0).optional().nullable(),
  rto_hours: z.coerce.number().int().min(0).optional().nullable(),
});

// Network form schema
export const networkFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  subnet: cidrOptionalSchema,
  gateway: ipv4OptionalSchema,
  dns_servers: z.string().optional().nullable().transform((val) => {
    if (!val) return null;
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }),
  vlan_id: z.coerce.number().int().min(1).max(4094).optional().nullable(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().nullable(),
  domain_id: z.string().uuid('Invalid domain ID'),
});

// License form schema
export const licenseFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  vendor: z.string().max(100, 'Vendor must be less than 100 characters').optional().nullable(),
  license_key: z.string().max(500, 'License key must be less than 500 characters').optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  cost: z.coerce.number().min(0, 'Cost must be 0 or greater').optional().default(0),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').optional().default(1),
  domain_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().max(255, 'Assigned to must be less than 255 characters').optional().nullable(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional().nullable(),
}).refine(
  (data) => {
    if (!data.purchase_date || !data.expiry_date) return true;
    return new Date(data.expiry_date) > new Date(data.purchase_date);
  },
  { message: 'Expiry date must be after purchase date', path: ['expiry_date'] }
);

// Web Apps form schema
export const webAppFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  url: urlRequiredSchema,
  description: z.string().max(500, 'Description must be less than 500 characters').optional().nullable(),
  icon: z.string().optional().default('globe'),
  category: z.string().max(50, 'Category must be less than 50 characters').optional().nullable(),
  domain_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
});

// Task form schema
export const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional().nullable(),
  server_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  frequency: z.enum(['once', 'daily', 'weekly', 'monthly']).default('once'),
  due_date: z.string().optional().nullable(),
});

// Vacation form schema
export const vacationFormSchema = z.object({
  profile_id: z.string().uuid().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  vacation_type: z.enum(['annual', 'sick', 'emergency', 'unpaid']).default('annual'),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional().nullable(),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'End date must be after or equal to start date', path: ['end_date'] }
);

// Maintenance Window form schema
export const maintenanceWindowFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional().nullable(),
  domain_id: z.string().uuid().optional().nullable(),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('once'),
  affected_servers: z.array(z.string()).optional().nullable(),
  impact_level: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional().nullable(),
}).refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  { message: 'End time must be after start time', path: ['end_time'] }
);

// On-Call Schedule form schema
export const onCallScheduleFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  domain_id: z.string().uuid().optional().nullable(),
  rotation_type: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).default('weekly'),
  team_members: z.array(z.string().uuid()).min(1, 'At least one team member is required'),
  is_active: z.boolean().default(true),
});

// Vault Item form schema
export const vaultItemFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  username: z.string().max(255, 'Username must be less than 255 characters').optional().nullable(),
  password: z.string().optional(),
  url: urlOptionalSchema,
  item_type: z.enum(['server', 'website', 'network_device', 'application', 'api_key', 'other']).default('other'),
  linked_server_id: z.string().uuid().optional().nullable(),
  linked_network_id: z.string().uuid().optional().nullable(),
  linked_application_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  requires_2fa_reveal: z.boolean().default(false),
});

// Datacenter form schema
export const datacenterFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  location: z.string().max(200, 'Location must be less than 200 characters').optional().nullable(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional().nullable(),
  power_capacity_kw: z.coerce.number().min(0, 'Must be 0 or greater').optional().nullable(),
  rack_count: z.coerce.number().int().min(0, 'Must be 0 or greater').optional().nullable(),
  floor_space_sqm: z.coerce.number().min(0, 'Must be 0 or greater').optional().nullable(),
  tier_level: z.string().optional().nullable(),
  cooling_type: z.string().optional().nullable(),
  contact_person: z.string().max(100, 'Contact person must be less than 100 characters').optional().nullable(),
  emergency_contact: z.string().max(100, 'Emergency contact must be less than 100 characters').optional().nullable(),
});

// Cluster form schema
export const clusterFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  domain_id: z.string().uuid('Domain is required'),
  datacenter_id: z.string().uuid().optional().nullable(),
  cluster_type: z.enum(['vmware', 'nutanix', 'hyperv', 'other']).default('vmware'),
  vendor: z.string().max(100, 'Vendor must be less than 100 characters').optional().nullable(),
  platform_version: z.string().max(50, 'Platform version must be less than 50 characters').optional().nullable(),
  hypervisor_version: z.string().max(50, 'Hypervisor version must be less than 50 characters').optional().nullable(),
  storage_type: z.enum(['all-flash', 'hybrid', 'hdd']).default('all-flash'),
  rf_level: z.enum(['RF1', 'RF2', 'RF3', 'N/A']).default('RF2'),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional().nullable(),
});

// Cluster node schema
export const clusterNodeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  mgmt_ip: ipv4OptionalSchema,
  ilo_idrac_ip: ipv4OptionalSchema,
  vendor: z.string().max(100, 'Vendor must be less than 100 characters').optional().nullable(),
  model: z.string().max(100, 'Model must be less than 100 characters').optional().nullable(),
  serial_number: z.string().max(100, 'Serial number must be less than 100 characters').optional().nullable(),
  cpu_sockets: positiveIntOptionalSchema,
  cpu_cores: positiveIntOptionalSchema,
  ram_gb: positiveIntOptionalSchema,
  storage_total_tb: positiveNumberOptionalSchema,
  storage_used_tb: positiveNumberOptionalSchema,
});

// VM schema
export const vmSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  ip: ipv4OptionalSchema,
  vcpu: positiveIntOptionalSchema,
  memory_gb: positiveIntOptionalSchema,
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional().nullable(),
});

// File share schema
export const fileShareFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  path: z.string().min(1, 'Path is required').max(500, 'Path must be less than 500 characters'),
  share_type: z.enum(['smb', 'nfs']).default('smb'),
  scan_mode: z.string().default('basic'),
  scan_depth: z.coerce.number().int().min(1, 'Depth must be at least 1').max(50, 'Depth must be at most 50').optional().default(10),
  is_enabled: z.boolean().default(true),
  exclude_patterns: z.array(z.string().max(200, 'Each pattern must be less than 200 characters')).optional().nullable(),
  domain_id: z.string().uuid('Domain is required'),
});

// Scan job schema
export const scanJobFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  ip_range: z.string().min(1, 'IP range is required')
    .refine((val) => cidrPattern.test(val) || ipv4Pattern.test(val), 
      'Must be a valid CIDR range or IP address'),
  scan_mode: z.enum(['basic', 'full', 'quick']).default('basic'),
  max_hosts: z.coerce.number().int().min(1, 'Must be at least 1').max(65535, 'Must be at most 65535').optional().default(254),
  domain_id: z.string().uuid().optional().nullable(),
  network_id: z.string().uuid().optional().nullable(),
});

// LDAP config schema
export const ldapConfigSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  host: hostnameSchema,
  port: portCoerceSchema.default(389),
  use_tls: z.boolean().default(false),
  base_dn: dnSchema,
  bind_dn: dnSchema,
  is_active: z.boolean().default(true),
});

// NTP config schema
export const ntpConfigSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  servers: z.array(z.string()).min(1, 'At least one server is required'),
  sync_interval_seconds: z.coerce.number().int().min(60).default(3600),
  is_active: z.boolean().default(true),
});

// Mail config schema
export const mailConfigSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  smtp_host: hostnameSchema,
  smtp_port: portCoerceSchema.default(587),
  use_tls: z.boolean().default(true),
  from_email: emailSchema,
  from_name: z.string().max(100, 'From name must be less than 100 characters').optional().nullable(),
  is_active: z.boolean().default(true),
});

// Domain form schema
export const domainFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().nullable(),
});

// ================== VALIDATION HELPER FUNCTIONS ==================

export function validateIPv4(value: string): boolean {
  return ipv4Pattern.test(value);
}

export function validateIPv6(value: string): boolean {
  return ipv6Pattern.test(value);
}

export function validateIP(value: string): boolean {
  return ipv4Pattern.test(value) || ipv6Pattern.test(value);
}

export function validateCIDR(value: string): boolean {
  return cidrPattern.test(value);
}

export function validateMAC(value: string): boolean {
  return macPattern.test(value);
}

export function validatePort(value: number | string): boolean {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return !isNaN(num) && num >= 1 && num <= 65535;
}

export function validateHostname(value: string): boolean {
  return hostnamePattern.test(value) || ipv4Pattern.test(value);
}

export function validateDN(value: string): boolean {
  return dnPattern.test(value);
}

export function validateEmail(value: string): boolean {
  return emailPattern.test(value);
}

export function validateUrl(value: string): boolean {
  return urlPattern.test(value);
}

// ================== FORM ERROR UTILITIES ==================

export function getZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}

export function getFirstZodError(error: z.ZodError): string {
  return error.issues[0]?.message || 'Validation failed';
}

// Validation result type
export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  errors: Record<string, string>;
  firstError: string;
};

// Generic validate function
export function validateForm<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: getZodErrors(result.error),
    firstError: getFirstZodError(result.error),
  };
}
