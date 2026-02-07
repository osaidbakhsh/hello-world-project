import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_OWNER_EMAIL = 'osaidbakhsh@gmail.com';
const REQUIRED_TYPE = 'RESET_EMPTY_PROD';
const REQUIRED_CONFIRM_TOKEN = 'CONFIRM_DELETE_ALL_DATA_EXCEPT_OWNER';
const REQUIRED_CONFIRM_PHRASE = 'DELETE ALL DATA';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ═════════════════════════════════════════════════════════════
    // Step 1: Parse request body
    // ═════════════════════════════════════════════════════════════
    const body = await req.json();
    const { type, confirm_token, confirm_phrase, dry_run } = body;

    // ═════════════════════════════════════════════════════════════
    // Step 2: Validate triple confirmation
    // ═════════════════════════════════════════════════════════════
    if (type !== REQUIRED_TYPE) {
      return new Response(
        JSON.stringify({
          error: 'Invalid confirmation',
          required: { type: REQUIRED_TYPE },
          got: { type },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (confirm_token !== REQUIRED_CONFIRM_TOKEN) {
      return new Response(
        JSON.stringify({
          error: 'Invalid confirmation token',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (confirm_phrase !== REQUIRED_CONFIRM_PHRASE) {
      return new Response(
        JSON.stringify({
          error: 'Invalid confirmation phrase',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═════════════════════════════════════════════════════════════
    // Step 3: Extract JWT from Authorization header
    // ═════════════════════════════════════════════════════════════
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice(7);

    // ═════════════════════════════════════════════════════════════
    // Step 4: Create Supabase client with user JWT
    // Using anon key + JWT so auth.uid() works in RPC
    // ═════════════════════════════════════════════════════════════
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // ═════════════════════════════════════════════════════════════
    // Step 5: Verify user is authenticated
    // ═════════════════════════════════════════════════════════════
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired JWT' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═════════════════════════════════════════════════════════════
    // Step 6: Defense in depth - verify email is owner
    // ═════════════════════════════════════════════════════════════
    if (user.email !== ALLOWED_OWNER_EMAIL) {
      console.warn(`Unauthorized reset attempt by: ${user.email}`);
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          reason: 'Only system owner can perform reset',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═════════════════════════════════════════════════════════════
    // Step 7: Defense in depth - verify super_admin role
    // ═════════════════════════════════════════════════════════════
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.warn(`Non-super-admin reset attempt by: ${user.email}`);
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          reason: 'Super admin role required',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═════════════════════════════════════════════════════════════
    // Step 8: Get owner's profile_id
    // ═════════════════════════════════════════════════════════════
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      return new Response(
        JSON.stringify({
          error: 'Profile not found',
          details: profileError?.message,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(
      `[RESET START] Owner: ${profileData.email} | Dry Run: ${!!dry_run} | Timestamp: ${new Date().toISOString()}`
    );

    // ═════════════════════════════════════════════════════════════
    // Step 9: Call RPC with user JWT
    // Database applies final security gates
    // ═════════════════════════════════════════════════════════════
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'reset_to_empty_prod',
      {
        p_owner_user_id: user.id,
        p_owner_profile_id: profileData.id,
        p_dry_run: !!dry_run,
      }
    );

    if (rpcError) {
      console.error('RPC error:', rpcError);
      return new Response(
        JSON.stringify({
          error: 'Reset failed',
          details: rpcError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(
      `[RESET ${dry_run ? 'PREVIEW' : 'COMPLETE'}] Owner: ${profileData.email} | Timestamp: ${new Date().toISOString()}`
    );

    // ═════════════════════════════════════════════════════════════
    // Return final report from RPC
    // ═════════════════════════════════════════════════════════════
    return new Response(
      JSON.stringify({
        success: true,
        message: dry_run
          ? 'Dry run completed. No data was deleted.'
          : 'Reset to empty production completed.',
        result: rpcResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RESET ERROR]', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
