import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { useSiteProfileIds } from '@/hooks/useSiteDomains';

export interface VaultItem {
  id: string;
  title: string;
  url: string | null;
  item_type: string;
  linked_server_id: string | null;
  linked_network_id: string | null;
  linked_application_id: string | null;
  tags: string[] | null;
  owner_id: string;
  requires_2fa_reveal: boolean;
  last_password_reveal: string | null;
  password_reveal_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Legacy fields (will be removed after migration phase 3)
  username?: string | null;
  notes?: string | null;
  password_encrypted?: string | null;
  password_iv?: string | null;
}

export interface VaultPermission {
  id: string;
  vault_item_id: string;
  profile_id: string;
  can_view: boolean;
  can_reveal: boolean;
  can_edit: boolean;
  permission_level: 'view_metadata' | 'view_secret';
  revoked_at: string | null;
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

interface EncryptedSecrets {
  password_encrypted: string | null;
  password_iv: string | null;
  username_encrypted: string | null;
  username_iv: string | null;
  notes_encrypted: string | null;
  notes_iv: string | null;
}

// My vault items (owner)
export function useVaultItems() {
  const { selectedSite } = useSite();
  const { data: siteProfileIds = [] } = useSiteProfileIds();

  return useQuery({
    queryKey: ['vault-items', selectedSite?.id, siteProfileIds],
    queryFn: async () => {
      let query = supabase
        .from('vault_items')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by owners in the selected site
      if (selectedSite && siteProfileIds.length > 0) {
        query = query.in('owner_id', siteProfileIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VaultItem[];
    },
    enabled: !selectedSite || siteProfileIds.length > 0,
  });
}

// Items shared with me
export function useVaultSharedWithMe() {
  const { profile } = useAuth();
  const { selectedSite } = useSite();
  const { data: siteProfileIds = [] } = useSiteProfileIds();

  return useQuery({
    queryKey: ['vault-shared-with-me', profile?.id, selectedSite?.id, siteProfileIds],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      // Get active permissions where I'm the grantee
      const { data: permissions, error: permError } = await supabase
        .from('vault_permissions')
        .select('vault_item_id, permission_level')
        .eq('profile_id', profile.id)
        .is('revoked_at', null);

      if (permError) throw permError;
      if (!permissions || permissions.length === 0) return [];

      // Get the vault items
      const itemIds = permissions.map(p => p.vault_item_id);
      let itemsQuery = supabase
        .from('vault_items')
        .select('*')
        .in('id', itemIds)
        .neq('owner_id', profile.id); // Exclude my own items

      // Filter by owners in the selected site
      if (selectedSite && siteProfileIds.length > 0) {
        itemsQuery = itemsQuery.in('owner_id', siteProfileIds);
      }

      const { data: items, error: itemsError } = await itemsQuery;

      if (itemsError) throw itemsError;

      // Merge permission level into items
      return (items || []).map(item => ({
        ...item,
        _permission_level: permissions.find(p => p.vault_item_id === item.id)?.permission_level || 'view_metadata',
      }));
    },
    enabled: !!profile?.id && (!selectedSite || siteProfileIds.length > 0),
  });
}

// My shares (items I've shared with others)
export function useMyShares(vaultItemId?: string) {
  return useQuery({
    queryKey: ['vault-my-shares', vaultItemId],
    queryFn: async () => {
      let query = supabase
        .from('vault_permissions')
        .select(`
          *,
          profile:profiles(id, full_name, email)
        `)
        .is('revoked_at', null);

      if (vaultItemId) {
        query = query.eq('vault_item_id', vaultItemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });
}

export function useVaultItemsByServer(serverId: string | undefined) {
  return useQuery({
    queryKey: ['vault-items', 'server', serverId],
    queryFn: async () => {
      if (!serverId) return [];
      const { data, error } = await supabase
        .from('vault_items')
        .select('id, title, item_type, url, owner_id')
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
        .eq('vault_item_id', vaultItemId)
        .is('revoked_at', null);

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
        
        if (typeof value === 'string') {
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          else if (!isNaN(Number(value))) value = Number(value);
        }
        
        if (key in settings) {
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

  // Encrypt secrets via edge function
  const encryptSecrets = async (data: { 
    password?: string; 
    username?: string; 
    notes?: string 
  }): Promise<EncryptedSecrets> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('vault-encrypt', {
      body: { 
        password: data.password || null,
        username: data.username || null,
        notes: data.notes || null,
      },
    });

    if (response.error) throw response.error;
    return response.data;
  };

  const createItem = useMutation({
    mutationFn: async (item: Partial<VaultItem> & { password?: string; username?: string; notes?: string }) => {
      // Step 1: Insert metadata into vault_items
      const { password, username, notes, ...rest } = item;
      
      const insertData: Record<string, unknown> = {
        title: rest.title || '',
        url: rest.url || null,
        item_type: rest.item_type || 'other',
        linked_server_id: rest.linked_server_id || null,
        linked_network_id: rest.linked_network_id || null,
        linked_application_id: rest.linked_application_id || null,
        tags: rest.tags || null,
        requires_2fa_reveal: rest.requires_2fa_reveal || false,
      };

      const { data: vaultItem, error } = await supabase
        .from('vault_items')
        .insert([insertData] as any)
        .select()
        .single();

      if (error) throw error;

      // Step 2: Encrypt and insert secrets if any provided
      if (password || username || notes) {
        const encrypted = await encryptSecrets({ password, username, notes });
        
        const { error: secretsError } = await supabase
          .from('vault_item_secrets')
          .insert({
            vault_item_id: vaultItem.id,
            password_encrypted: encrypted.password_encrypted,
            password_iv: encrypted.password_iv,
            username_encrypted: encrypted.username_encrypted,
            username_iv: encrypted.username_iv,
            notes_encrypted: encrypted.notes_encrypted,
            notes_iv: encrypted.notes_iv,
          });

        if (secretsError) throw secretsError;
      }

      // Log creation
      await supabase.from('vault_audit_logs').insert({
        vault_item_id: vaultItem.id,
        user_id: profile?.id,
        user_name: profile?.full_name,
        user_email: profile?.email,
        action: 'create',
        details: { title: vaultItem.title },
      });

      return vaultItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-items'] });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VaultItem> & { id: string; password?: string; username?: string; notes?: string }) => {
      const { password, username, notes, ...rest } = updates;

      // Update metadata
      const updateData: Record<string, unknown> = {};
      if (rest.title !== undefined) updateData.title = rest.title;
      if (rest.url !== undefined) updateData.url = rest.url;
      if (rest.item_type !== undefined) updateData.item_type = rest.item_type;
      if (rest.linked_server_id !== undefined) updateData.linked_server_id = rest.linked_server_id;
      if (rest.linked_network_id !== undefined) updateData.linked_network_id = rest.linked_network_id;
      if (rest.linked_application_id !== undefined) updateData.linked_application_id = rest.linked_application_id;
      if (rest.tags !== undefined) updateData.tags = rest.tags;
      if (rest.requires_2fa_reveal !== undefined) updateData.requires_2fa_reveal = rest.requires_2fa_reveal;

      const { data, error } = await supabase
        .from('vault_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update secrets if any provided
      if (password || username || notes) {
        const encrypted = await encryptSecrets({ password, username, notes });
        
        const secretsUpdate: Record<string, string | null> = {};
        if (encrypted.password_encrypted) {
          secretsUpdate.password_encrypted = encrypted.password_encrypted;
          secretsUpdate.password_iv = encrypted.password_iv;
        }
        if (encrypted.username_encrypted) {
          secretsUpdate.username_encrypted = encrypted.username_encrypted;
          secretsUpdate.username_iv = encrypted.username_iv;
        }
        if (encrypted.notes_encrypted) {
          secretsUpdate.notes_encrypted = encrypted.notes_encrypted;
          secretsUpdate.notes_iv = encrypted.notes_iv;
        }

        if (Object.keys(secretsUpdate).length > 0) {
          await supabase
            .from('vault_item_secrets')
            .upsert({
              vault_item_id: id,
              ...secretsUpdate,
            }, { onConflict: 'vault_item_id' });
        }
      }

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

  // Reveal a secret field
  const revealSecret = async (vaultItemId: string, field: 'password' | 'username' | 'notes' = 'password'): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('vault-decrypt', {
      body: { vault_item_id: vaultItemId, field },
    });

    if (response.error) throw new Error(response.error.message || 'Failed to decrypt');
    if (response.data?.error) throw new Error(response.data.error);
    
    return response.data[field] || response.data.password;
  };

  // Legacy alias for backward compatibility
  const revealPassword = (vaultItemId: string) => revealSecret(vaultItemId, 'password');

  // Share item with another user
  const shareItem = useMutation({
    mutationFn: async ({ 
      vaultItemId, 
      profileId, 
      permissionLevel 
    }: { 
      vaultItemId: string; 
      profileId: string; 
      permissionLevel: 'view_metadata' | 'view_secret' 
    }) => {
      const { data, error } = await supabase
        .from('vault_permissions')
        .insert({
          vault_item_id: vaultItemId,
          profile_id: profileId,
          permission_level: permissionLevel,
          can_view: true,
          can_reveal: permissionLevel === 'view_secret',
          can_edit: false,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log share action
      await supabase.from('vault_audit_logs').insert({
        vault_item_id: vaultItemId,
        user_id: profile?.id,
        user_name: profile?.full_name,
        user_email: profile?.email,
        action: 'share_created',
        details: { grantee_id: profileId, permission_level: permissionLevel },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vault-permissions', variables.vaultItemId] });
      queryClient.invalidateQueries({ queryKey: ['vault-my-shares'] });
    },
  });

  // Revoke share
  const revokeShare = useMutation({
    mutationFn: async ({ vaultItemId, profileId }: { vaultItemId: string; profileId: string }) => {
      const { error } = await supabase
        .from('vault_permissions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('vault_item_id', vaultItemId)
        .eq('profile_id', profileId)
        .is('revoked_at', null);

      if (error) throw error;

      // Log revoke action
      await supabase.from('vault_audit_logs').insert({
        vault_item_id: vaultItemId,
        user_id: profile?.id,
        user_name: profile?.full_name,
        user_email: profile?.email,
        action: 'share_revoked',
        details: { revoked_profile_id: profileId },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vault-permissions', variables.vaultItemId] });
      queryClient.invalidateQueries({ queryKey: ['vault-my-shares'] });
      queryClient.invalidateQueries({ queryKey: ['vault-shared-with-me'] });
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
    revealSecret,
    shareItem,
    revokeShare,
    updateSetting,
  };
}
