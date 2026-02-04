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
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error('Invalid hex string format');
  }
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
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { credential_id } = await req.json();

    if (!credential_id) {
      return new Response(JSON.stringify({ error: 'Missing credential_id' }), {
        status: 400,
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

    // Get the credential
    const { data: credential, error: credError } = await supabase
      .from('infrastructure_credentials')
      .select('*')
      .eq('id', credential_id)
      .single();

    if (credError || !credential) {
      return new Response(JSON.stringify({ error: 'Credential not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has operator access to the resource
    const { data: hasAccess } = await supabase
      .rpc('check_resource_access', {
        _resource_id: credential.resource_id,
        _resource_type: credential.resource_type,
        _required_role: 'operator'
      });

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Forbidden - Operator access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // LOG THE ACCESS ATTEMPT BEFORE DECRYPTION (Audit Trail)
    await supabase.from('infra_credential_access_logs').insert({
      credential_id,
      accessed_by: profile.id,
      access_type: 'reveal',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
      user_agent: req.headers.get('user-agent') || null,
      resource_id: credential.resource_id,
      resource_type: credential.resource_type,
    });

    // Decrypt the secret value
    const keyBytes = hexToBytes(encryptionKey);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const encryptedBytes = hexToBytes(credential.encrypted_value);
    const ivBytes = hexToBytes(credential.encryption_iv);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer },
      cryptoKey,
      encryptedBytes.buffer as ArrayBuffer
    );

    const decoder = new TextDecoder();
    const decryptedValue = decoder.decode(decryptedData);

    console.log('Infrastructure credential revealed:', credential_id, 'by user:', profile.id);

    return new Response(JSON.stringify({ 
      secret_value: decryptedValue,
      secret_name: credential.secret_name
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Infra vault decrypt error:', message);
    return new Response(JSON.stringify({ error: 'Decryption failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
