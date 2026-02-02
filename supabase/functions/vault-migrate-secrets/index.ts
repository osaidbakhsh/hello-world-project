import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeHexKey(input: string): string {
  const trimmed = input.trim();
  return trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed.slice(2) : trimmed;
}

function isValidAes256HexKey(hex: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(hex);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function encryptField(
  value: string | null | undefined,
  cryptoKey: CryptoKey
): Promise<{ encrypted: string | null; iv: string | null }> {
  if (!value) return { encrypted: null, iv: null };

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(value);

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );

  return {
    encrypted: bytesToHex(new Uint8Array(encryptedData)),
    iv: bytesToHex(iv),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const rawEncryptionKey = Deno.env.get('VAULT_ENCRYPTION_KEY');

    if (!rawEncryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const encryptionKey = normalizeHexKey(rawEncryptionKey);
    if (!isValidAes256HexKey(encryptionKey)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid VAULT_ENCRYPTION_KEY.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify auth - this function requires admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token and verify admin status
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is super_admin (only super_admin can run migration)
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single();

    if (!userRole) {
      return new Response(JSON.stringify({ error: 'Only super_admin can run migration' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Import the encryption key
    const keyBytes = hexToBytes(encryptionKey);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Get all vault_items with plaintext username or notes
    // Use service role to bypass RLS for migration
    const { data: items, error: itemsError } = await supabase
      .from('vault_items')
      .select('id, username, notes')
      .or('username.neq.null,notes.neq.null');

    if (itemsError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch items', details: itemsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of items || []) {
      try {
        // Check if already migrated
        const { data: existing } = await supabase
          .from('vault_item_secrets')
          .select('username_encrypted, notes_encrypted')
          .eq('vault_item_id', item.id)
          .single();

        // Skip if already has encrypted username/notes
        if (existing?.username_encrypted && item.username) {
          skipped++;
          continue;
        }
        if (existing?.notes_encrypted && item.notes) {
          skipped++;
          continue;
        }

        // Encrypt username if exists
        const usernameResult = item.username
          ? await encryptField(item.username, cryptoKey)
          : { encrypted: null, iv: null };

        // Encrypt notes if exists
        const notesResult = item.notes
          ? await encryptField(item.notes, cryptoKey)
          : { encrypted: null, iv: null };

        // Upsert into vault_item_secrets
        const updateData: Record<string, string | null> = {};
        if (usernameResult.encrypted) {
          updateData.username_encrypted = usernameResult.encrypted;
          updateData.username_iv = usernameResult.iv;
        }
        if (notesResult.encrypted) {
          updateData.notes_encrypted = notesResult.encrypted;
          updateData.notes_iv = notesResult.iv;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: upsertError } = await supabase
            .from('vault_item_secrets')
            .upsert({
              vault_item_id: item.id,
              ...updateData,
            }, { onConflict: 'vault_item_id' });

          if (upsertError) {
            errors.push(`Item ${item.id}: ${upsertError.message}`);
          } else {
            migrated++;
          }
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        errors.push(`Item ${item.id}: ${errorMsg}`);
      }
    }

    console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      total: items?.length || 0,
      migrated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Migration error:', message);
    return new Response(JSON.stringify({ error: 'Migration failed', message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
