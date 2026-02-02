import { z } from 'zod';

// IPv4 validation pattern
const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// Hostname validation pattern (RFC 1123)
const hostnamePattern = /^(?=.{1,253}$)(?:(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)*(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/;

// DN (Distinguished Name) basic validation for LDAP
const dnPattern = /^(([A-Za-z]+=[^,]+),?)+$/;

// Email validation
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Schema definitions
export const ipv4Schema = z.string().regex(ipv4Pattern, 'Invalid IPv4 address');

export const ipv4OptionalSchema = z.string()
  .optional()
  .nullable()
  .refine((val) => !val || ipv4Pattern.test(val), 'Invalid IPv4 address');

export const portSchema = z.number()
  .int('Port must be an integer')
  .min(1, 'Port must be at least 1')
  .max(65535, 'Port must be at most 65535');

export const portStringSchema = z.string()
  .refine((val) => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num >= 1 && num <= 65535;
  }, 'Port must be a number between 1 and 65535');

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

// Server form schema
export const serverFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ip_address: ipv4OptionalSchema,
  operating_system: z.string().optional().nullable(),
  environment: z.string().optional().default('production'),
  status: z.string().optional().default('active'),
  owner: z.string().optional().nullable(),
  responsible_user: z.string().optional().nullable(),
  disk_space: z.string().optional().nullable(),
  ram: z.string().optional().nullable(),
  cpu: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  network_id: z.string().uuid().optional().nullable(),
});

// LDAP config schema
export const ldapConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  host: hostnameSchema,
  port: portSchema.default(389),
  use_tls: z.boolean().default(false),
  base_dn: dnSchema,
  bind_dn: dnSchema,
  is_active: z.boolean().default(true),
});

// NTP config schema
export const ntpConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  servers: z.array(z.string()).min(1, 'At least one server is required'),
  sync_interval_seconds: z.number().int().min(60).default(3600),
  is_active: z.boolean().default(true),
});

// Mail config schema
export const mailConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  smtp_host: hostnameSchema,
  smtp_port: portSchema.default(587),
  use_tls: z.boolean().default(true),
  from_email: emailSchema,
  from_name: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

// Network form schema
export const networkFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subnet: z.string().optional().nullable(),
  gateway: ipv4OptionalSchema,
  dns_servers: z.array(z.string()).optional().nullable(),
  description: z.string().optional().nullable(),
  domain_id: z.string().uuid('Invalid domain ID'),
});

// Cluster node schema
export const clusterNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mgmt_ip: ipv4OptionalSchema,
  ilo_idrac_ip: ipv4OptionalSchema,
  vendor: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  cpu_sockets: z.number().int().min(0).optional().nullable(),
  cpu_cores: z.number().int().min(0).optional().nullable(),
  ram_gb: z.number().min(0).optional().nullable(),
  storage_total_tb: z.number().min(0).optional().nullable(),
  storage_used_tb: z.number().min(0).optional().nullable(),
});

// Validation helper functions
export function validateIPv4(value: string): boolean {
  return ipv4Pattern.test(value);
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

// Form error message extractor
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
