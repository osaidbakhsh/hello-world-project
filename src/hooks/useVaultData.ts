import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface VaultItem {
  id: string;
  title: string;
  username: string | null;
  password_encrypted: string | null;
  password_iv: string | null;
  url: string | null;
  item_type: string;
  linked_server_id: string | null;
  linked_network_id: string | null;
  linked_application_id: string | null;
  notes: string | null;
  tags: string[] | null;
  owner_id: string;
  requires_2fa_reveal: boolean;
  last_password_reveal: string | null;
  password_reveal_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface VaultPermission {
  id: string;
  vault_item_id: string;
  profile_id: string;
  can_view: boolean;
  can_reveal: boolean;
  can_edit: boolean;
  created_at: string;
  created_by: string | null;
}

export interface VaultAuditLog {
  id: string;
  vault_item_id: string | null;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface VaultSettings {
  reveal_duration_seconds: number;
  auto_lock_minutes: number;
  global_reveal_disabled: boolean;
  require_2fa_for_reveal: boolean;
}

export function useVaultItems() {
  return useQuery({
    queryKey: ['vault-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vault_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VaultItem[];
    },
  });
}

export function useVaultItemsByServer(serverId: string | undefined) {
  return useQuery({
    queryKey: ['vault-items', 'server', serverId],
    queryFn: async () => {
      if (!serverId) return [];
      const { data, error } = await supabase
        .from('vault_items')
        .select('id, title, username, item_type, url, owner_id')
        .eq('linked_server_id', serverId);

      if (error) throw error;
      return data;
    },
    enabled: !!serverId,
  });
}

export function useVaultPermissions(vaultItemId: string | undefined) {
  return useQuery({
    queryKey: ['vault-permissions', vaultItemId],
    queryFn: async () => {
      if (!vaultItemId) return [];
      const { data, error } = await supabase
        .from('vault_permissions')
        .select('*')
        .eq('vault_item_id', vaultItemId);

      if (error) throw error;
      return data as VaultPermission[];
    },
    enabled: !!vaultItemId,
  });
}

export function useVaultAuditLogs(vaultItemId?: string) {
  return useQuery({
    queryKey: ['vault-audit-logs', vaultItemId],
    queryFn: async () => {
      let query = supabase
        .from('vault_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (vaultItemId) {
        query = query.eq('vault_item_id', vaultItemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VaultAuditLog[];
    },
  });
}

export function useVaultSettings() {
  return useQuery({
    queryKey: ['vault-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vault_settings')
        .select('key, value');

      if (error) throw error;

      const settings: VaultSettings = {
        reveal_duration_seconds: 10,
        auto_lock_minutes: 5,
        global_reveal_disabled: false,
        require_2fa_for_reveal: false,
      };

      data?.forEach((item: { key: string; value: unknown }) => {
        const key = item.key as keyof VaultSettings;
        let value = item.value;
        
        // Parse string values
        if (typeof value === 'string') {
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          else if (!isNaN(Number(value))) value = Number(value);
        }
        
        if (key in settings) {
          // Type-safe assignment
          if (key === 'reveal_duration_seconds' || key === 'auto_lock_minutes') {
            settings[key] = typeof value === 'number' ? value : Number(value) || settings[key];
          } else if (key === 'global_reveal_disabled' || key === 'require_2fa_for_reveal') {
            settings[key] = typeof value === 'boolean' ? value : value === true;
          }
        }
      });

      return settings;
    },
  });
}

export function useVaultMutations() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const encryptPassword = async (password: string): Promise<{ encrypted: string; iv: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('vault-encrypt', {
      body: { password },
    });

    if (response.error) throw response.error;
    return response.data;
  };

  const createItem = useMutation({
    mutationFn: async (item: Partial<VaultItem> & { password?: string }) => {
      let passwordEncrypted: string | null = null;
      let passwordIv: string | null = null;

      if (item.password) {
        const encrypted = await encryptPassword(item.password);
        passwordEncrypted = encrypted.encrypted;
        passwordIv = encrypted.iv;
      }

      const { password, ...rest } = item;
      
      const insertData = {
        title: rest.title || '',
        username: rest.username || null,
        url: rest.url || null,
        item_type: rest.item_type || 'other',
        linked_server_id: rest.linked_server_id || null,
        linked_network_id: rest.linked_network_id || null,
        linked_application_id: rest.linked_application_id || null,
        notes: rest.notes || null,
        tags: rest.tags || null,
        requires_2fa_reveal: rest.requires_2fa_reveal || false,
        owner_id: profile?.id || '',
        created_by: profile?.id || null,
      };

      // Insert with password fields using raw insert data
      const fullInsertData = {
        ...insertData,
        password_encrypted: passwordEncrypted,
        password_iv: passwordIv,
      };

      const { data, error } = await supabase
        .from('vault_items')
        .insert([fullInsertData] as any)
        .select()
        .single();

      if (error) throw error;

      // Log creation
      await supabase.from('vault_audit_logs').insert({
        vault_item_id: data.id,
        user_id: profile?.id,
        user_name: profile?.full_name,
        user_email: profile?.email,
        action: 'create',
        details: { title: data.title },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-items'] });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VaultItem> & { id: string; password?: string }) => {
      let passwordEncrypted: string | undefined = undefined;
      let passwordIv: string | undefined = undefined;

      if (updates.password) {
        const encrypted = await encryptPassword(updates.password);
        passwordEncrypted = encrypted.encrypted;
        passwordIv = encrypted.iv;
      }

      const { password, ...rest } = updates;

      const updateData: Record<string, unknown> = {};
      
      // Only include fields that are explicitly set
      if (rest.title !== undefined) updateData.title = rest.title;
      if (rest.username !== undefined) updateData.username = rest.username;
      if (rest.url !== undefined) updateData.url = rest.url;
      if (rest.item_type !== undefined) updateData.item_type = rest.item_type;
      if (rest.linked_server_id !== undefined) updateData.linked_server_id = rest.linked_server_id;
      if (rest.linked_network_id !== undefined) updateData.linked_network_id = rest.linked_network_id;
      if (rest.linked_application_id !== undefined) updateData.linked_application_id = rest.linked_application_id;
      if (rest.notes !== undefined) updateData.notes = rest.notes;
      if (rest.tags !== undefined) updateData.tags = rest.tags;
      if (rest.requires_2fa_reveal !== undefined) updateData.requires_2fa_reveal = rest.requires_2fa_reveal;

      const { data, error } = await supabase
        .from('vault_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log update
      await supabase.from('vault_audit_logs').insert({
        vault_item_id: id,
        user_id: profile?.id,
        user_name: profile?.full_name,
        user_email: profile?.email,
        action: 'update',
        details: { title: data.title, updated_fields: Object.keys(updateData) },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-items'] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      // Get item title for audit log before deletion
      const { data: item } = await supabase
        .from('vault_items')
        .select('title')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('vault_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log deletion
      await supabase.from('vault_audit_logs').insert({
        vault_item_id: null,
        user_id: profile?.id,
        user_name: profile?.full_name,
        user_email: profile?.email,
        action: 'delete',
        details: { deleted_item_id: id, title: item?.title },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-items'] });
    },
  });

  const revealPassword = async (vaultItemId: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('vault-decrypt', {
      body: { vault_item_id: vaultItemId },
    });

    if (response.error) throw new Error(response.error.message || 'Failed to decrypt');
    if (response.data?.error) throw new Error(response.data.error);
    
    return response.data.password;
  };

  const updatePermission = useMutation({
    mutationFn: async (permission: Partial<VaultPermission> & { vault_item_id: string; profile_id: string }) => {
      const { data, error } = await supabase
        .from('vault_permissions')
        .upsert(permission, { onConflict: 'vault_item_id,profile_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vault-permissions', variables.vault_item_id] });
    },
  });

  const deletePermission = useMutation({
    mutationFn: async ({ vaultItemId, profileId }: { vaultItemId: string; profileId: string }) => {
      const { error } = await supabase
        .from('vault_permissions')
        .delete()
        .eq('vault_item_id', vaultItemId)
        .eq('profile_id', profileId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vault-permissions', variables.vaultItemId] });
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from('vault_settings')
        .update({ value: JSON.stringify(value) })
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-settings'] });
    },
  });

  return {
    createItem,
    updateItem,
    deleteItem,
    revealPassword,
    updatePermission,
    deletePermission,
    updateSetting,
  };
}
