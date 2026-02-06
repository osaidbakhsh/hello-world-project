/**
 * RBAC Service - Server-side role assignment management
 * Handles fetching and managing role assignments via Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import type { ScopeType, RoleName } from '@/security/roles';

// Types
export interface Role {
  id: string;
  name: string;
  description: string | null;
  capabilities: string[];
  created_at: string;
}

export interface RoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  scope_type: ScopeType;
  scope_id: string;
  status: 'active' | 'disabled';
  granted_by: string | null;
  granted_at: string;
  notes: string | null;
  // Joined fields
  role_name?: string;
  scope_name?: string;
  owning_site_id?: string;
  user_email?: string;
  user_full_name?: string;
  granted_by_name?: string;
}

export interface MyRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  role_name: string;
  capabilities: string[];
  scope_type: ScopeType;
  scope_id: string;
  status: 'active' | 'disabled';
  granted_at: string;
  notes: string | null;
  scope_name: string | null;
  owning_site_id: string | null;
}

export interface CreateRoleAssignmentInput {
  user_id: string;
  role_id: string;
  scope_type: ScopeType;
  scope_id: string;
  notes?: string;
}

export interface UpdateRoleAssignmentInput {
  status?: 'active' | 'disabled';
  notes?: string;
}

// ============================================================
// FETCH OPERATIONS
// ============================================================

/**
 * Fetch all available roles
 */
export async function fetchRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    created_at: r.created_at,
    capabilities: Array.isArray(r.capabilities) ? (r.capabilities as string[]) : [],
  }));
}

/**
 * Fetch my effective role assignments (uses the secure view)
 */
export async function fetchMyRoleAssignments(): Promise<MyRoleAssignment[]> {
  const { data, error } = await supabase
    .from('v_my_role_assignments')
    .select('*');

  if (error) throw error;
  return (data || []) as MyRoleAssignment[];
}

/**
 * Fetch role assignments for a specific site scope
 * Used by SiteAdmins to manage assignments within their site
 */
export async function fetchRoleAssignmentsForSite(siteId: string): Promise<RoleAssignment[]> {
  // Get direct site assignments
  const { data: siteAssignments, error: siteError } = await supabase
    .from('role_assignments')
    .select(`
      *,
      roles:role_id (name)
    `)
    .eq('scope_type', 'site')
    .eq('scope_id', siteId)
    .order('granted_at', { ascending: false });

  if (siteError) throw siteError;

  // Get domains under this site
  const { data: domains } = await supabase
    .from('domains')
    .select('id')
    .eq('site_id', siteId);

  const domainIds = domains?.map(d => d.id) || [];

  // Get domain assignments
  let domainAssignments: any[] = [];
  if (domainIds.length > 0) {
    const { data, error } = await supabase
      .from('role_assignments')
      .select(`
        *,
        roles:role_id (name)
      `)
      .eq('scope_type', 'domain')
      .in('scope_id', domainIds)
      .order('granted_at', { ascending: false });

    if (error) throw error;
    domainAssignments = data || [];
  }

  // Get clusters under this site (via datacenters)
  const { data: datacenters } = await supabase
    .from('datacenters')
    .select('id')
    .eq('site_id', siteId);

  const dcIds = datacenters?.map(d => d.id) || [];

  let clusterAssignments: any[] = [];
  if (dcIds.length > 0) {
    const { data: clusters } = await supabase
      .from('clusters')
      .select('id')
      .in('datacenter_id', dcIds);

    const clusterIds = clusters?.map(c => c.id) || [];

    if (clusterIds.length > 0) {
      const { data, error } = await supabase
        .from('role_assignments')
        .select(`
          *,
          roles:role_id (name)
        `)
        .eq('scope_type', 'cluster')
        .in('scope_id', clusterIds)
        .order('granted_at', { ascending: false });

      if (error) throw error;
      clusterAssignments = data || [];
    }
  }

  // Combine all assignments
  const allAssignments = [...(siteAssignments || []), ...domainAssignments, ...clusterAssignments];
  
  // Fetch user profiles separately
  const userIds = [...new Set(allAssignments.map(a => a.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, email, full_name')
    .in('user_id', userIds);
  
  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

  return allAssignments.map(a => ({
    ...a,
    role_name: (a.roles as any)?.name,
    user_email: profileMap.get(a.user_id)?.email,
    user_full_name: profileMap.get(a.user_id)?.full_name,
    owning_site_id: siteId,
  }));
}

/**
 * Fetch all role assignments (SuperAdmin only)
 */
export async function fetchAllRoleAssignments(): Promise<RoleAssignment[]> {
  const { data, error } = await supabase
    .from('role_assignments')
    .select(`
      *,
      roles:role_id (name)
    `)
    .order('granted_at', { ascending: false });

  if (error) throw error;
  
  // Fetch user profiles separately to avoid relation issues
  const userIds = [...new Set((data || []).map(a => a.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, email, full_name')
    .in('user_id', userIds);
  
  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

  return (data || []).map(a => ({
    ...a,
    role_name: (a.roles as any)?.name,
    user_email: profileMap.get(a.user_id)?.email,
    user_full_name: profileMap.get(a.user_id)?.full_name,
  }));
}

/**
 * Fetch role assignments for a specific user
 */
export async function fetchUserRoleAssignments(userId: string): Promise<RoleAssignment[]> {
  const { data, error } = await supabase
    .from('role_assignments')
    .select(`
      *,
      roles:role_id (name)
    `)
    .eq('user_id', userId)
    .order('granted_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(a => ({
    ...a,
    role_name: (a.roles as any)?.name,
  }));
}

// ============================================================
// MUTATION OPERATIONS
// ============================================================

/**
 * Create a new role assignment
 */
export async function createRoleAssignment(input: CreateRoleAssignmentInput): Promise<RoleAssignment> {
  // Get current user's profile ID for granted_by
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  const { data, error } = await supabase
    .from('role_assignments')
    .insert({
      user_id: input.user_id,
      role_id: input.role_id,
      scope_type: input.scope_type,
      scope_id: input.scope_id,
      notes: input.notes,
      granted_by: profile?.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Log to audit
  await logRbacAction('rbac.assign', data.id, null, data);

  return data as RoleAssignment;
}

/**
 * Update a role assignment (typically to disable)
 */
export async function updateRoleAssignment(
  id: string,
  input: UpdateRoleAssignmentInput
): Promise<RoleAssignment> {
  // Fetch old data for audit
  const { data: oldData } = await supabase
    .from('role_assignments')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('role_assignments')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Log to audit
  const action = input.status === 'disabled' ? 'rbac.disable' : 'rbac.update';
  await logRbacAction(action, id, oldData, data);

  return data as RoleAssignment;
}

/**
 * Delete a role assignment (hard delete - SuperAdmin only)
 */
export async function deleteRoleAssignment(id: string): Promise<void> {
  // Fetch old data for audit
  const { data: oldData } = await supabase
    .from('role_assignments')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('role_assignments')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Log to audit
  await logRbacAction('rbac.delete', id, oldData, null);
}

// ============================================================
// AUDIT LOGGING
// ============================================================

async function logRbacAction(
  action: string,
  recordId: string,
  oldData: any,
  newData: any
): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('user_id', user.user?.id)
      .single();

    await supabase.from('audit_logs').insert({
      action,
      table_name: 'role_assignments',
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
      user_id: profile?.id,
      user_name: profile?.full_name,
      user_email: profile?.email,
      entity_name: 'Role Assignment',
    });
  } catch (e) {
    console.error('Failed to log RBAC action:', e);
  }
}

// ============================================================
// SCOPE RESOLUTION HELPERS
// ============================================================

/**
 * Get scope name for display
 */
export async function getScopeName(scopeType: ScopeType, scopeId: string): Promise<string> {
  let name = 'Unknown';

  try {
    switch (scopeType) {
      case 'site': {
        const { data } = await supabase.from('sites').select('name').eq('id', scopeId).single();
        name = data?.name || 'Unknown Site';
        break;
      }
      case 'domain': {
        const { data } = await supabase.from('domains').select('name').eq('id', scopeId).single();
        name = data?.name || 'Unknown Domain';
        break;
      }
      case 'cluster': {
        const { data } = await supabase.from('clusters').select('name').eq('id', scopeId).single();
        name = data?.name || 'Unknown Cluster';
        break;
      }
    }
  } catch {
    // Ignore errors
  }

  return name;
}

/**
 * Get available scope options for a given scope type
 */
export async function getScopeOptions(scopeType: ScopeType, siteId?: string): Promise<{ id: string; name: string }[]> {
  switch (scopeType) {
    case 'site': {
      const { data } = await supabase.from('sites').select('id, name').order('name');
      return data || [];
    }
    case 'domain': {
      let query = supabase.from('domains').select('id, name').order('name');
      if (siteId) {
        query = query.eq('site_id', siteId);
      }
      const { data } = await query;
      return data || [];
    }
    case 'cluster': {
      // Get clusters through datacenters
      if (siteId) {
        const { data: dcs } = await supabase.from('datacenters').select('id').eq('site_id', siteId);
        const dcIds = dcs?.map(d => d.id) || [];
        if (dcIds.length > 0) {
          const { data } = await supabase.from('clusters').select('id, name').in('datacenter_id', dcIds).order('name');
          return data || [];
        }
        return [];
      }
      const { data } = await supabase.from('clusters').select('id, name').order('name');
      return data || [];
    }
    default:
      return [];
  }
}
