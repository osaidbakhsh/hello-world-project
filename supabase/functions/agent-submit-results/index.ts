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

    const body = await req.json();
    const { scan_job_id, results, progress, completed, error: scanError } = body;

    if (!scan_job_id) {
      return new Response(
        JSON.stringify({ error: 'scan_job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify scan job belongs to agent's domain
    const { data: scanJob, error: scanJobError } = await supabaseAdmin
      .from('scan_jobs')
      .select('*')
      .eq('id', scan_job_id)
      .eq('domain_id', agent.domain_id)
      .single();

    if (scanJobError || !scanJob) {
      return new Response(
        JSON.stringify({ error: 'Scan job not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Insert scan results if provided
    if (results && Array.isArray(results) && results.length > 0) {
      const resultsToInsert = results.map((r: any) => ({
        scan_job_id,
        domain_id: agent.domain_id,
        ip_address: r.ip || r.ip_address,
        hostname: r.hostname || null,
        mac_address: r.mac || r.mac_address || null,
        os_type: r.os || r.os_type || null,
        os_version: r.os_version || null,
        vendor: r.vendor || null,
        device_type: r.device_type || 'unknown',
        open_ports: r.open_ports || r.ports || null,
        rtt_ms: r.rtt_ms || r.rtt || null,
        is_alive: r.is_alive !== undefined ? r.is_alive : true,
        raw_data: r.raw || r.raw_data || null,
        last_seen: new Date().toISOString(),
      }));

      const { error: insertError } = await supabaseAdmin
        .from('scan_results')
        .upsert(resultsToInsert, { 
          onConflict: 'scan_job_id,ip_address',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error('Error inserting results:', insertError);
        // Log error event
        await supabaseAdmin
          .from('agent_events')
          .insert({
            agent_id: agent.id,
            domain_id: agent.domain_id,
            event_type: 'error',
            payload: {
              scan_job_id,
              error: insertError.message,
              timestamp: new Date().toISOString(),
            },
          });
      }
    }

    // Update progress if provided
    if (progress) {
      await supabaseAdmin
        .from('scan_jobs')
        .update({
          progress,
          status: 'running',
        })
        .eq('id', scan_job_id);
    }

    // Mark as complete if done
    if (completed) {
      const finalStatus = scanError ? 'failed' : 'done';
      await supabaseAdmin
        .from('scan_jobs')
        .update({
          status: finalStatus,
          finished_at: new Date().toISOString(),
          error_details: scanError ? { message: scanError } : null,
        })
        .eq('id', scan_job_id);

      // Log completion event
      await supabaseAdmin
        .from('agent_events')
        .insert({
          agent_id: agent.id,
          domain_id: agent.domain_id,
          event_type: scanError ? 'error' : 'scan_complete',
          payload: {
            scan_job_id,
            results_count: results?.length || 0,
            error: scanError || null,
            timestamp: new Date().toISOString(),
          },
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        agent_id: agent.id,
        scan_job_id,
        results_received: results?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Agent submit results error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
