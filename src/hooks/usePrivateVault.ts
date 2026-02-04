import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PrivateVaultItem {
  id: string;
  owner_id: string;
  title: string;
  content_type: string | null;
  encrypted_content: string;
  encryption_iv: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

interface CreateVaultItemParams {
  title: string;
  content_type?: string;
  plainContent: string;
  metadata?: Record<string, unknown>;
}

// Client-side encryption using Web Crypto API
async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

async function encryptContent(content: string, passphrase: string): Promise<{ encrypted: string; iv: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassphrase(passphrase, salt);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return {
    encrypted: bytesToHex(new Uint8Array(encryptedData)),
    iv: bytesToHex(iv),
    salt: bytesToHex(salt),
  };
}

async function decryptContent(encrypted: string, iv: string, salt: string, passphrase: string): Promise<string> {
  const saltBytes = hexToBytes(salt);
  const ivBytes = hexToBytes(iv);
  const encryptedBytes = hexToBytes(encrypted);
  
  const key = await deriveKeyFromPassphrase(passphrase, saltBytes);
  
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer },
    key,
    encryptedBytes.buffer as ArrayBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

export const usePrivateVault = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [masterPassphrase, setMasterPassphrase] = useState<string | null>(null);
  const [decryptedItems, setDecryptedItems] = useState<Record<string, string>>({});
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Fetch vault items (metadata only - content is encrypted)
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['private-vault', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_private_vault')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PrivateVaultItem[];
    },
    enabled: !!user?.id,
  });

  // Unlock vault with master passphrase
  const unlockVault = useCallback((passphrase: string) => {
    setMasterPassphrase(passphrase);
    setIsUnlocked(true);
    setDecryptedItems({});
  }, []);

  // Lock vault (clear passphrase from memory)
  const lockVault = useCallback(() => {
    setMasterPassphrase(null);
    setIsUnlocked(false);
    setDecryptedItems({});
  }, []);

  // Create new vault item
  const createItem = useMutation({
    mutationFn: async (params: CreateVaultItemParams) => {
      if (!masterPassphrase || !user?.id) {
        throw new Error('Vault not unlocked');
      }

      const { encrypted, iv, salt } = await encryptContent(params.plainContent, masterPassphrase);

      const { data, error } = await supabase
        .from('user_private_vault')
        .insert({
          owner_id: user.id,
          title: params.title,
          content_type: params.content_type || 'note',
          encrypted_content: encrypted,
          encryption_iv: iv,
          metadata: { ...params.metadata, salt },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-vault', user?.id] });
      toast.success('تم حفظ العنصر في الخزنة الخاصة');
    },
    onError: (error: Error) => {
      console.error('Create private vault item error:', error);
      toast.error('فشل في حفظ العنصر');
    },
  });

  // Decrypt an item
  const decryptItem = useCallback(async (itemId: string): Promise<string | null> => {
    if (!masterPassphrase) {
      toast.error('الخزنة مقفلة');
      return null;
    }

    if (decryptedItems[itemId]) {
      return decryptedItems[itemId];
    }

    const item = items.find(i => i.id === itemId);
    if (!item) {
      toast.error('العنصر غير موجود');
      return null;
    }

    try {
      const salt = (item.metadata as Record<string, string>)?.salt;
      if (!salt) {
        throw new Error('Missing encryption salt');
      }

      const decrypted = await decryptContent(
        item.encrypted_content,
        item.encryption_iv,
        salt,
        masterPassphrase
      );

      setDecryptedItems(prev => ({ ...prev, [itemId]: decrypted }));
      return decrypted;
    } catch (error) {
      console.error('Decrypt error:', error);
      toast.error('فشل في فك التشفير - تحقق من عبارة المرور');
      return null;
    }
  }, [masterPassphrase, items, decryptedItems]);

  // Hide decrypted content
  const hideItem = useCallback((itemId: string) => {
    setDecryptedItems(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  }, []);

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('user_private_vault')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-vault', user?.id] });
      toast.success('تم حذف العنصر');
    },
    onError: () => {
      toast.error('فشل في حذف العنصر');
    },
  });

  // Update item
  const updateItem = useMutation({
    mutationFn: async ({ itemId, title, plainContent }: { itemId: string; title: string; plainContent: string }) => {
      if (!masterPassphrase) {
        throw new Error('Vault not unlocked');
      }

      const { encrypted, iv, salt } = await encryptContent(plainContent, masterPassphrase);

      const { data, error } = await supabase
        .from('user_private_vault')
        .update({
          title,
          encrypted_content: encrypted,
          encryption_iv: iv,
          metadata: { salt },
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['private-vault', user?.id] });
      // Clear decrypted cache for this item
      setDecryptedItems(prev => {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      });
      toast.success('تم تحديث العنصر');
    },
    onError: () => {
      toast.error('فشل في تحديث العنصر');
    },
  });

  return {
    items,
    isLoading,
    error,
    isUnlocked,
    unlockVault,
    lockVault,
    createItem,
    decryptItem,
    hideItem,
    deleteItem,
    updateItem,
    decryptedItems,
  };
};
