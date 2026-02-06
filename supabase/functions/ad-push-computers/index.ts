import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
};

interface ADComputerItem {
  name: string;
  dnsHostname?: string;
  enabled?: boolean;
  lastLogon?: string;
  operatingSystem?: string;
  osVersion?: string;
  osServicePack?: string;
  ouDn?: string;
  adSiteName?: string;
}

interface ADComputersPayload {
  siteCode: string;
  domainFqdn: string;
  capturedAt: string;
  mode: 'full' | 'delta';
  items: ADComputerItem[];
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

    let payload: ADComputersPayload;
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

    // Transform and upsert computers in batches
    const batchSize = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < payload.items.length; i += batchSize) {
      const batch = payload.items.slice(i, i + batchSize);
      
      const records = batch.map(computer => ({
        site_id: siteId,
        domain_id: domainId,
        captured_at: capturedAt,
        name: computer.name,
        dns_hostname: computer.dnsHostname || null,
        enabled: computer.enabled ?? true,
        last_logon: computer.lastLogon ? new Date(computer.lastLogon).toISOString() : null,
        operating_system: computer.operatingSystem || null,
        os_version: computer.osVersion || null,
        os_service_pack: computer.osServicePack || null,
        ou_dn: computer.ouDn || null,
        ad_site_name: computer.adSiteName || null,
      }));

      const { error: upsertError } = await supabaseAdmin
        .from('ad_computers')
        .upsert(records, { onConflict: 'domain_id,captured_at,name' });

      if (upsertError) {
        console.error('Error upserting computers batch:', upsertError);
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
    console.error('AD push computers error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
