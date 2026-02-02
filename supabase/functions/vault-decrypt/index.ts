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

// Hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
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
          error: 'Invalid VAULT_ENCRYPTION_KEY. It must be exactly 64 hex characters (32 bytes) for AES-256-GCM.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { vault_item_id } = await req.json();

    if (!vault_item_id) {
      return new Response(JSON.stringify({ error: 'Vault item ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if global reveal is disabled
    const { data: globalSetting } = await supabase
      .from('vault_settings')
      .select('value')
      .eq('key', 'global_reveal_disabled')
      .single();

    if (globalSetting?.value === true || globalSetting?.value === 'true') {
      return new Response(JSON.stringify({ error: 'Password reveal is globally disabled' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the vault item
    const { data: vaultItem, error: vaultError } = await supabase
      .from('vault_items')
      .select('*')
      .eq('id', vault_item_id)
      .single();

    if (vaultError || !vaultItem) {
      return new Response(JSON.stringify({ error: 'Vault item not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check permissions: admin, owner, or has reveal permission
    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';
    const isOwner = vaultItem.owner_id === profile.id;
    
    let hasPermission = isAdmin || isOwner;

    if (!hasPermission) {
      const { data: permission } = await supabase
        .from('vault_permissions')
        .select('can_reveal')
        .eq('vault_item_id', vault_item_id)
        .eq('profile_id', profile.id)
        .single();

      hasPermission = permission?.can_reveal === true;
    }

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'No permission to reveal password' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if password exists
    if (!vaultItem.password_encrypted || !vaultItem.password_iv) {
      return new Response(JSON.stringify({ error: 'No password stored' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract IV - handle both string and Buffer object formats
    let ivHex: string;
    const storedIv = vaultItem.password_iv;
    
    if (typeof storedIv === 'string') {
      ivHex = storedIv.trim();
    } else if (storedIv && typeof storedIv === 'object' && 'data' in storedIv && Array.isArray(storedIv.data)) {
      // Buffer object format: { type: 'Buffer', data: [...] }
      ivHex = String.fromCharCode(...storedIv.data);
    } else {
      console.error('Unknown IV format:', typeof storedIv, storedIv);
      return new Response(
        JSON.stringify({ error: 'Invalid stored IV format.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate IV length (should be 24 hex chars = 12 bytes for GCM)
    if (ivHex.length !== 24) {
      console.error('Invalid IV length:', ivHex.length, 'expected 24 hex chars (12 bytes)');
      return new Response(
        JSON.stringify({ 
          error: 'Invalid stored IV. This item was encrypted with an incompatible format. Please re-save the password.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Extract encrypted data - handle both string and Buffer object formats
    let encryptedHex: string;
    const storedEnc = vaultItem.password_encrypted;
    
    if (typeof storedEnc === 'string') {
      encryptedHex = storedEnc.trim();
    } else if (storedEnc && typeof storedEnc === 'object' && 'data' in storedEnc && Array.isArray(storedEnc.data)) {
      encryptedHex = String.fromCharCode(...storedEnc.data);
    } else {
      console.error('Unknown encrypted format:', typeof storedEnc);
      return new Response(
        JSON.stringify({ error: 'Invalid stored encrypted data format.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Decrypt the password
    const keyBytes = hexToBytes(encryptionKey);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const encryptedBytes = hexToBytes(encryptedHex);
    const ivBytes = hexToBytes(ivHex);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer },
      cryptoKey,
      encryptedBytes.buffer as ArrayBuffer
    );

    const decoder = new TextDecoder();
    const password = decoder.decode(decryptedData);

    // Log the reveal action (NEVER log the password itself)
    await supabase.from('vault_audit_logs').insert({
      vault_item_id,
      user_id: profile.id,
      user_name: profile.full_name,
      user_email: profile.email,
      action: 'reveal_password',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
      user_agent: req.headers.get('user-agent') || null,
      details: { item_title: vaultItem.title },
    });

    // Update reveal count and timestamp
    await supabase
      .from('vault_items')
      .update({
        last_password_reveal: new Date().toISOString(),
        password_reveal_count: (vaultItem.password_reveal_count || 0) + 1,
      })
      .eq('id', vault_item_id);

    console.log('Password revealed for vault item:', vault_item_id, 'by user:', profile.id);

    return new Response(JSON.stringify({ password }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Decryption error:', message);
    return new Response(JSON.stringify({ error: 'Decryption failed', message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
