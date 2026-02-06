import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
};

interface ADUserItem {
  sid: string;
  samAccountName: string;
  displayName?: string;
  userPrincipalName?: string;
  email?: string;
  enabled?: boolean;
  locked?: boolean;
  accountExpiresAt?: string;
  pwdLastSet?: string;
  pwdExpiresAt?: string;
  pwdNeverExpires?: boolean;
  lastLogon?: string;
  logonCount?: number;
  department?: string;
  title?: string;
  managerDn?: string;
  ouDn?: string;
}

interface ADUsersPayload {
  siteCode: string;
  domainFqdn: string;
  capturedAt: string;
  mode: 'full' | 'delta';
  items: ADUserItem[];
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validateAgent(supabaseAdmin: any, agentKey: string): Promise<{ agent: any; error: string | null }> {
  const keyHash = await hashToken(agentKey);
  
  const { data: agent, error } = await supabaseAdmin
    .from('scan_agents')
    .select('*')
    .eq('auth_token_hash', keyHash)
    .maybeSingle();

  if (error || !agent) {
    return { agent: null, error: 'Invalid agent key' };
  }

  return { agent, error: null };
}

async function resolveEntities(
  supabaseAdmin: any, 
  siteCode: string, 
  domainFqdn: string
): Promise<{ siteId: string | null; domainId: string | null; error: string | null }> {
  const { data: site } = await supabaseAdmin
    .from('sites')
    .select('id')
    .eq('code', siteCode)
    .maybeSingle();

  if (!site) {
    return { siteId: null, domainId: null, error: `Site not found: ${siteCode}` };
  }

  let { data: domain } = await supabaseAdmin
    .from('domains')
    .select('id, site_id')
    .eq('fqdn', domainFqdn)
    .eq('site_id', site.id)
    .maybeSingle();

  if (!domain) {
    const { data: domainByName } = await supabaseAdmin
      .from('domains')
      .select('id, site_id')
      .eq('name', domainFqdn.split('.')[0])
      .eq('site_id', site.id)
      .maybeSingle();
    domain = domainByName;
  }

  if (!domain) {
    return { siteId: site.id, domainId: null, error: `Domain not found: ${domainFqdn}` };
  }

  return { siteId: site.id, domainId: domain.id, error: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const agentKey = req.headers.get('x-agent-key');
    if (!agentKey) {
      return new Response(
        JSON.stringify({ error: 'Missing agent key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { agent, error: authError } = await validateAgent(supabaseAdmin, agentKey);
    if (authError) {
      return new Response(
        JSON.stringify({ error: authError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let payload: ADUsersPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.siteCode || !payload.domainFqdn || !payload.capturedAt || !payload.items) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { siteId, domainId, error: resolveError } = await resolveEntities(
      supabaseAdmin,
      payload.siteCode,
      payload.domainFqdn
    );

    if (resolveError) {
      return new Response(
        JSON.stringify({ error: resolveError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const capturedAt = new Date(payload.capturedAt).toISOString();

    // If full mode, we might want to delete old records first (optional)
    // For now, we'll just upsert

    // Transform and upsert users in batches
    const batchSize = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < payload.items.length; i += batchSize) {
      const batch = payload.items.slice(i, i + batchSize);
      
      const records = batch.map(user => ({
        site_id: siteId,
        domain_id: domainId,
        captured_at: capturedAt,
        sid: user.sid,
        sam_account_name: user.samAccountName,
        display_name: user.displayName || null,
        user_principal_name: user.userPrincipalName || null,
        email: user.email || null,
        enabled: user.enabled ?? true,
        locked: user.locked ?? false,
        account_expires_at: user.accountExpiresAt ? new Date(user.accountExpiresAt).toISOString() : null,
        pwd_last_set: user.pwdLastSet ? new Date(user.pwdLastSet).toISOString() : null,
        pwd_expires_at: user.pwdExpiresAt ? new Date(user.pwdExpiresAt).toISOString() : null,
        pwd_never_expires: user.pwdNeverExpires ?? false,
        last_logon: user.lastLogon ? new Date(user.lastLogon).toISOString() : null,
        logon_count: user.logonCount || 0,
        department: user.department || null,
        title: user.title || null,
        manager_dn: user.managerDn || null,
        ou_dn: user.ouDn || null,
      }));

      const { error: upsertError } = await supabaseAdmin
        .from('ad_users')
        .upsert(records, { onConflict: 'domain_id,captured_at,sid' });

      if (upsertError) {
        console.error('Error upserting users batch:', upsertError);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    // Update agent last_seen
    await supabaseAdmin
      .from('scan_agents')
      .update({
        status: 'ONLINE',
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', agent.id);

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        errors,
        captured_at: capturedAt,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('AD push users error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
