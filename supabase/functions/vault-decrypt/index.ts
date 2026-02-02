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

// Strict hex-to-bytes parsing (not base64)
function hexToBytes(hex: string): Uint8Array {
  // Validate hex string format
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error('Invalid hex string format');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Decode double-hex-encoded string (hex of hex) back to original hex
// Example: "363162" (hex of "61b") -> "61b"
function decodeDoubleHex(input: string): string {
  // Check if it's double-encoded: all chars are 0-9a-f and length is double expected
  // For IV: expected 24 chars, double would be 48
  // For encrypted data: variable, but if all bytes decode to valid hex chars, it's double-encoded
  if (!/^[0-9a-fA-F]*$/.test(input) || input.length % 2 !== 0) {
    return input;
  }
  
  // Try to decode as double-hex
  let decoded = '';
  for (let i = 0; i < input.length; i += 2) {
    const byte = parseInt(input.substr(i, 2), 16);
    const char = String.fromCharCode(byte);
    // Valid hex char check
    if (!/^[0-9a-fA-F]$/.test(char)) {
      // Not double-encoded, return original
      return input;
    }
    decoded += char;
  }
  return decoded;
}

// Normalize hex string - handles double-encoding if detected
function normalizeHexData(input: string, expectedLength: number): string {
  // If length matches expected, assume it's correct
  if (input.length === expectedLength) {
    return input;
  }
  // If length is double expected, try to decode
  if (input.length === expectedLength * 2) {
    const decoded = decodeDoubleHex(input);
    if (decoded.length === expectedLength) {
      return decoded;
    }
  }
  // Return as-is and let validation fail if it's wrong
  return input;
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
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { vault_item_id, field = 'password' } = body;

    if (!vault_item_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate field parameter
    const validFields = ['password', 'username', 'notes'];
    if (!validFields.includes(field)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
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
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the vault item (to check ownership)
    const { data: vaultItem, error: vaultError } = await supabase
      .from('vault_items')
      .select('id, owner_id, title')
      .eq('id', vault_item_id)
      .single();

    if (vaultError || !vaultItem) {
      // Return generic 403 to prevent enumeration
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Permission check - NO admin override
    const isOwner = vaultItem.owner_id === profile.id;
    let hasPermission = isOwner;

    if (!hasPermission) {
      const { data: permission } = await supabase
        .from('vault_permissions')
        .select('permission_level')
        .eq('vault_item_id', vault_item_id)
        .eq('profile_id', profile.id)
        .is('revoked_at', null)
        .single();

      hasPermission = permission?.permission_level === 'view_secret';
    }

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Query secrets from vault_item_secrets table (TEXT columns)
    const { data: secrets, error: secretsError } = await supabase
      .from('vault_item_secrets')
      .select('*')
      .eq('vault_item_id', vault_item_id)
      .single();

    if (secretsError || !secrets) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the requested field (already hex TEXT, may be double-encoded)
    const encryptedHexRaw = secrets[`${field}_encrypted`] as string | null;
    const ivHexRaw = secrets[`${field}_iv`] as string | null;

    if (!encryptedHexRaw || !ivHexRaw) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize IV (should be 24 hex chars = 12 bytes for GCM)
    const ivHex = normalizeHexData(ivHexRaw, 24);
    
    // Validate IV length after normalization
    if (ivHex.length !== 24) {
      console.error('Invalid IV length after normalization:', ivHex.length, 'expected 24, raw was:', ivHexRaw.length);
      return new Response(JSON.stringify({ error: 'Decryption failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize encrypted data (no fixed length, but detect double-encoding by IV pattern)
    // If IV was double-encoded, encrypted data likely is too
    const wasDoubleEncoded = ivHexRaw.length === 48;
    const encryptedHex = wasDoubleEncoded ? decodeDoubleHex(encryptedHexRaw) : encryptedHexRaw;

    // Decrypt the field using strict hex parsing
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
    const decryptedValue = decoder.decode(decryptedData);

    // Log the reveal action (NEVER log the decrypted value itself)
    await supabase.from('vault_audit_logs').insert({
      vault_item_id,
      user_id: profile.id,
      user_name: profile.full_name,
      user_email: profile.email,
      action: `reveal_${field}`,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
      user_agent: req.headers.get('user-agent') || null,
      details: { item_title: vaultItem.title, field },
    });

    // Update reveal count and timestamp on vault_items
    await supabase
      .from('vault_items')
      .update({
        last_password_reveal: new Date().toISOString(),
        password_reveal_count: (await supabase
          .from('vault_items')
          .select('password_reveal_count')
          .eq('id', vault_item_id)
          .single()
        ).data?.password_reveal_count + 1 || 1,
      })
      .eq('id', vault_item_id);

    console.log(`${field} revealed for vault item:`, vault_item_id, 'by user:', profile.id);

    // Return the decrypted value with a generic key for backward compatibility
    const responseKey = field === 'password' ? 'password' : field;
    return new Response(JSON.stringify({ [responseKey]: decryptedValue }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Decryption error:', message);
    // Return generic error to prevent information leakage
    return new Response(JSON.stringify({ error: 'Decryption failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
