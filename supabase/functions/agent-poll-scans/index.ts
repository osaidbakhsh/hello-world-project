import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
};

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

    // Hash the provided key
    const keyHash = await hashToken(agentKey);

    // Find agent by key hash
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('scan_agents')
      .select('*')
      .eq('auth_token_hash', keyHash)
      .maybeSingle();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: 'Invalid agent key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_seen
    await supabaseAdmin
      .from('scan_agents')
      .update({
        status: 'ONLINE',
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', agent.id);

    // Find pending scan jobs for agent's domain
    const { data: pendingScans, error: scansError } = await supabaseAdmin
      .from('scan_jobs')
      .select('*')
      .eq('domain_id', agent.domain_id)
      .in('status', ['pending', 'queued'])
      .order('created_at', { ascending: true })
      .limit(5);

    if (scansError) {
      console.error('Error fetching scan jobs:', scansError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch scan jobs', details: scansError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark first job as running if any
    if (pendingScans && pendingScans.length > 0) {
      const firstScan = pendingScans[0];
      await supabaseAdmin
        .from('scan_jobs')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', firstScan.id)
        .eq('status', 'pending'); // Only if still pending

      // Log scan start event
      await supabaseAdmin
        .from('agent_events')
        .insert({
          agent_id: agent.id,
          domain_id: agent.domain_id,
          event_type: 'scan_start',
          payload: {
            scan_job_id: firstScan.id,
            ip_range: firstScan.ip_range,
            timestamp: new Date().toISOString(),
          },
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        agent_id: agent.id,
        scans: pendingScans || [],
        count: pendingScans?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Agent poll scans error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
