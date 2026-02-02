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

    // Parse request body for status info
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    // Update agent last_seen and status
    const { error: updateError } = await supabaseAdmin
      .from('scan_agents')
      .update({
        status: 'ONLINE',
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', agent.id);

    if (updateError) {
      console.error('Error updating agent:', updateError);
    }

    // Log heartbeat event (only every 10th heartbeat to avoid flooding)
    const shouldLog = Math.random() < 0.1; // 10% chance
    if (shouldLog) {
      await supabaseAdmin
        .from('agent_events')
        .insert({
          agent_id: agent.id,
          domain_id: agent.domain_id,
          event_type: 'heartbeat',
          payload: {
            cpu_percent: body.cpu_percent,
            memory_percent: body.memory_percent,
            disk_percent: body.disk_percent,
            timestamp: new Date().toISOString(),
          },
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        agent_id: agent.id,
        status: 'ONLINE',
        server_time: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Agent heartbeat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
