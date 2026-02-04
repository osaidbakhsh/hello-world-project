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
        JSON.stringify({ error: 'Invalid encryption key configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { resource_id, resource_type, secret_name, secret_value } = await req.json();

    if (!resource_id || !resource_type || !secret_name || !secret_value) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has admin access to the resource
    const { data: hasAccess } = await supabase
      .rpc('check_resource_access', {
        _resource_id: resource_id,
        _resource_type: resource_type,
        _required_role: 'admin'
      });

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Encrypt the secret value using AES-256-GCM
    const keyBytes = hexToBytes(encryptionKey);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(secret_value);

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );

    const encryptedHex = bytesToHex(new Uint8Array(encryptedData));
    const ivHex = bytesToHex(iv);

    // Store in infrastructure_credentials table
    const { data: credential, error: insertError } = await supabase
      .from('infrastructure_credentials')
      .upsert({
        resource_id,
        resource_type,
        secret_name,
        encrypted_value: encryptedHex,
        encryption_iv: ivHex,
        created_by: profile.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'resource_id,secret_name'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to store credential' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Infrastructure credential encrypted for resource:', resource_id, 'by user:', profile.id);

    return new Response(JSON.stringify({ 
      success: true, 
      credential_id: credential.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Infra vault encrypt error:', message);
    return new Response(JSON.stringify({ error: 'Encryption failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
