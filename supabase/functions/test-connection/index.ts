import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation patterns
const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const hostnamePattern = /^(?=.{1,253}$)(?:(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)*(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/;
const dnPattern = /^(([A-Za-z]+=[^,]+),?)+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateHost(host: string): { valid: boolean; message: string } {
  if (!host || host.trim() === '') {
    return { valid: false, message: 'Host is required' };
  }
  if (ipv4Pattern.test(host) || hostnamePattern.test(host)) {
    return { valid: true, message: 'Host format is valid' };
  }
  return { valid: false, message: 'Invalid hostname or IP address format' };
}

function validatePort(port: number): { valid: boolean; message: string } {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { valid: false, message: 'Port must be between 1 and 65535' };
  }
  return { valid: true, message: 'Port is valid' };
}

function validateDN(dn: string | null): { valid: boolean; message: string } {
  if (!dn || dn.trim() === '') {
    return { valid: true, message: 'DN is optional and not provided' };
  }
  if (dnPattern.test(dn)) {
    return { valid: true, message: 'DN format is valid' };
  }
  return { valid: false, message: 'Invalid Distinguished Name format (e.g., DC=example,DC=com)' };
}

function validateEmail(email: string | null): { valid: boolean; message: string } {
  if (!email || email.trim() === '') {
    return { valid: true, message: 'Email is optional and not provided' };
  }
  if (emailPattern.test(email)) {
    return { valid: true, message: 'Email format is valid' };
  }
  return { valid: false, message: 'Invalid email address format' };
}

function validateNtpServers(servers: string[]): { valid: boolean; message: string; details: string[] } {
  if (!servers || servers.length === 0) {
    return { valid: false, message: 'At least one NTP server is required', details: [] };
  }
  
  const details: string[] = [];
  let allValid = true;
  
  for (const server of servers) {
    if (ipv4Pattern.test(server) || hostnamePattern.test(server)) {
      details.push(`✓ ${server} - valid`);
    } else {
      details.push(`✗ ${server} - invalid format`);
      allValid = false;
    }
  }
  
  return {
    valid: allValid,
    message: allValid ? 'All NTP servers are valid' : 'Some NTP servers have invalid format',
    details,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with user's token for permission check
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const body = await req.json();
    const { domain_id, module, config_id } = body;

    if (!domain_id || !module) {
      return new Response(
        JSON.stringify({ error: 'domain_id and module are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // SECURITY: Verify domain access using server-side check
    // =====================================================
    
    // Check if user is super_admin
    const { data: superAdminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();
    
    const isSuperAdmin = !!superAdminRole;

    if (!isSuperAdmin) {
      // Check if user has domain access via domain_memberships
      const { data: membership } = await supabaseAdmin
        .from('domain_memberships')
        .select('id, domain_role, can_edit')
        .eq('domain_id', domain_id)
        .eq('profile_id', profile?.id)
        .maybeSingle();

      if (!membership) {
        return new Response(
          JSON.stringify({ error: 'Access denied: You do not have access to this domain' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // For write operations (running test), require domain_admin role
      const isDomainAdmin = membership.domain_role === 'domain_admin' || membership.can_edit === true;
      if (!isDomainAdmin) {
        return new Response(
          JSON.stringify({ error: 'Access denied: Domain admin access required to run tests' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let testResult: {
      status: 'success' | 'fail' | 'validation_only';
      message: string;
      error_details: any;
    };

    // Perform validation based on module type
    switch (module) {
      case 'ldap': {
        if (!config_id) {
          testResult = { status: 'fail', message: 'config_id is required for LDAP test', error_details: null };
          break;
        }
        
        const { data: config, error } = await supabaseAdmin
          .from('ldap_configs')
          .select('*')
          .eq('id', config_id)
          .single();
        
        if (error || !config) {
          testResult = { status: 'fail', message: 'LDAP configuration not found', error_details: error };
          break;
        }

        // Verify config belongs to the requested domain
        if (config.domain_id !== domain_id) {
          testResult = { status: 'fail', message: 'Configuration does not belong to this domain', error_details: null };
          break;
        }

        const hostValidation = validateHost(config.host);
        const portValidation = validatePort(config.port);
        const baseDnValidation = validateDN(config.base_dn);
        const bindDnValidation = validateDN(config.bind_dn);

        const allValid = hostValidation.valid && portValidation.valid && baseDnValidation.valid && bindDnValidation.valid;
        
        testResult = {
          status: allValid ? 'validation_only' : 'fail',
          message: allValid 
            ? `LDAP configuration validated: ${config.host}:${config.port} (TLS: ${config.use_tls}). Network connectivity test not available in hosted environment.`
            : 'LDAP configuration validation failed',
          error_details: {
            host: hostValidation,
            port: portValidation,
            base_dn: baseDnValidation,
            bind_dn: bindDnValidation,
          },
        };
        break;
      }

      case 'ntp': {
        if (!config_id) {
          testResult = { status: 'fail', message: 'config_id is required for NTP test', error_details: null };
          break;
        }
        
        const { data: config, error } = await supabaseAdmin
          .from('ntp_configs')
          .select('*')
          .eq('id', config_id)
          .single();
        
        if (error || !config) {
          testResult = { status: 'fail', message: 'NTP configuration not found', error_details: error };
          break;
        }

        // Verify config belongs to the requested domain
        if (config.domain_id !== domain_id) {
          testResult = { status: 'fail', message: 'Configuration does not belong to this domain', error_details: null };
          break;
        }

        const serversValidation = validateNtpServers(config.servers || []);
        
        testResult = {
          status: serversValidation.valid ? 'validation_only' : 'fail',
          message: serversValidation.valid 
            ? `NTP configuration validated: ${config.servers?.length || 0} server(s). Network connectivity test not available in hosted environment.`
            : 'NTP configuration validation failed',
          error_details: {
            servers: serversValidation,
          },
        };
        break;
      }

      case 'mail': {
        if (!config_id) {
          testResult = { status: 'fail', message: 'config_id is required for Mail test', error_details: null };
          break;
        }
        
        const { data: config, error } = await supabaseAdmin
          .from('mail_configs')
          .select('*')
          .eq('id', config_id)
          .single();
        
        if (error || !config) {
          testResult = { status: 'fail', message: 'Mail configuration not found', error_details: error };
          break;
        }

        // Verify config belongs to the requested domain
        if (config.domain_id !== domain_id) {
          testResult = { status: 'fail', message: 'Configuration does not belong to this domain', error_details: null };
          break;
        }

        const hostValidation = validateHost(config.smtp_host);
        const portValidation = validatePort(config.smtp_port);
        const emailValidation = validateEmail(config.from_email);

        const allValid = hostValidation.valid && portValidation.valid && emailValidation.valid;
        
        testResult = {
          status: allValid ? 'validation_only' : 'fail',
          message: allValid 
            ? `Mail configuration validated: ${config.smtp_host}:${config.smtp_port} (TLS: ${config.use_tls}). SMTP connectivity test not available in hosted environment.`
            : 'Mail configuration validation failed',
          error_details: {
            smtp_host: hostValidation,
            smtp_port: portValidation,
            from_email: emailValidation,
          },
        };
        break;
      }

      case 'fileshare': {
        if (!config_id) {
          testResult = { status: 'fail', message: 'config_id is required for File Share test', error_details: null };
          break;
        }
        
        const { data: fileShare, error } = await supabaseAdmin
          .from('file_shares')
          .select('*')
          .eq('id', config_id)
          .single();
        
        if (error || !fileShare) {
          testResult = { status: 'fail', message: 'File share not found', error_details: error };
          break;
        }

        // Verify file share belongs to the requested domain
        if (fileShare.domain_id !== domain_id) {
          testResult = { status: 'fail', message: 'File share does not belong to this domain', error_details: null };
          break;
        }

        // Validate path format
        const pathValid = fileShare.path && fileShare.path.trim().length > 0;
        const verifyStatus = pathValid ? 'ok' : 'fail';
        
        // Update file share verify status
        await supabaseAdmin
          .from('file_shares')
          .update({ 
            verify_status: verifyStatus,
            last_verified_at: new Date().toISOString()
          })
          .eq('id', config_id);
        
        testResult = {
          status: pathValid ? 'validation_only' : 'fail',
          message: pathValid 
            ? `File share configuration validated: ${fileShare.path}. Network access test requires scan agent.`
            : 'Invalid file share path',
          error_details: { path: fileShare.path },
        };
        break;
      }

      default:
        testResult = { status: 'fail', message: `Unknown module: ${module}`, error_details: null };
    }

    const latencyMs = Date.now() - startTime;

    // Record test result
    const insertData: any = {
      domain_id,
      module,
      requested_by: profile?.id,
      status: testResult.status,
      latency_ms: latencyMs,
      message: testResult.message,
      error_details: testResult.error_details,
    };

    // Add the appropriate config ID field
    if (config_id) {
      if (module === 'ldap') insertData.ldap_config_id = config_id;
      if (module === 'ntp') insertData.ntp_config_id = config_id;
      if (module === 'mail') insertData.mail_config_id = config_id;
      if (module === 'fileshare') insertData.fileshare_id = config_id;
    }

    const { error: insertError } = await supabaseAdmin
      .from('connection_test_runs')
      .insert([insertData]);

    if (insertError) {
      console.error('Error recording test result:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: testResult.status !== 'fail',
        status: testResult.status,
        latency_ms: latencyMs,
        message: testResult.message,
        error_details: testResult.error_details,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Test connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
