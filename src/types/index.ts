// Server types
export type ServerEnvironment = 'production' | 'testing' | 'development' | 'staging';
export type ServerStatus = 'active' | 'inactive' | 'maintenance';

export interface DiskInfo {
  drive: string;
  totalGB: number;
  usedGB: number;
  freeGB: number;
}

export interface ServerUser {
  username: string;
  role: string;
  lastLogin?: string;
}

export interface Server {
  id: string;
  name: string;
  ipAddress: string;
  os: string;
  osVersion: string;
  environment: ServerEnvironment;
  owner: string;
  responsible: string;
  description: string;
  disks: DiskInfo[];
  users: ServerUser[];
  networkId: string;
  status: ServerStatus;
  lastUpdate: string;
  createdAt: string;
}

// Network types
export interface Network {
  id: string;
  name: string;
  domain: string;
  ipRange: string;
  description: string;
  createdAt: string;
}

// Employee types
export interface Vacation {
  id: string;
  startDate: string;
  endDate: string;
  type: 'annual' | 'sick' | 'emergency' | 'unpaid';
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export interface Training {
  id: string;
  name: string;
  provider: string;
  startDate: string;
  endDate: string;
  status: 'planned' | 'in-progress' | 'completed';
  certificate?: string;
  notes?: string;
}

export interface YearlyGoal {
  id: string;
  title: string;
  description?: string;
  year: number;
  status: 'not-started' | 'in-progress' | 'completed';
  progress: number;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  department: string;
  hireDate: string;
  vacations: Vacation[];
  trainings: Training[];
  assignedServerIds: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  skills?: string[];
  certifications?: string[];
  yearlyGoals?: YearlyGoal[];
}

// License types
export type LicenseStatus = 'active' | 'expired' | 'expiring-soon';

export interface License {
  id: string;
  name: string;
  product: string;
  licenseKey: string;
  startDate: string;
  expiryDate: string;
  serverId?: string;
  cost: number;
  currency: string;
  vendor: string;
  notes?: string;
  createdAt: string;
}

// Task types
export type TaskFrequency = 'daily' | 'weekly' | 'monthly' | 'once';
export type TaskStatus = 'pending' | 'completed' | 'overdue';

export interface Task {
  id: string;
  name: string;
  description: string;
  assigneeId: string;
  frequency: TaskFrequency;
  dueDate: string;
  status: TaskStatus;
  serverId?: string;
  completedAt?: string;
  createdAt: string;
}

// Statistics types
export interface DashboardStats {
  totalServers: number;
  activeServers: number;
  expiringLicenses: number;
  pendingTasks: number;
  totalEmployees: number;
  totalNetworks: number;
  serversByEnvironment: Record<ServerEnvironment, number>;
  tasksByStatus: Record<TaskStatus, number>;
}
