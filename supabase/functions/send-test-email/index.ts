import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  config_id: string;
  recipient_email: string;
  domain_id: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { config_id, recipient_email, domain_id }: TestEmailRequest = await req.json();

    if (!config_id || !recipient_email || !domain_id) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields: config_id, recipient_email, domain_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch mail config
    const { data: config, error: configError } = await supabase
      .from("mail_configs")
      .select("*")
      .eq("id", config_id)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ success: false, message: "Mail config not found", error: configError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate config
    if (!config.smtp_host) {
      return new Response(
        JSON.stringify({ success: false, message: "SMTP host is not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();
    let client: SMTPClient | null = null;

    try {
      // Create SMTP client
      client = new SMTPClient({
        connection: {
          hostname: config.smtp_host,
          port: config.smtp_port || 587,
          tls: config.use_tls !== false,
          auth: config.smtp_username ? {
            username: config.smtp_username,
            password: config.smtp_password_encrypted || "", // In production, decrypt this
          } : undefined,
        },
      });

      // Send test email
      await client.send({
        from: config.from_email || `noreply@${config.smtp_host}`,
        to: recipient_email,
        subject: "🧪 IT Infrastructure Manager - Test Email",
        content: `
          This is a test email from IT Infrastructure Manager.
          
          SMTP Configuration:
          - Host: ${config.smtp_host}
          - Port: ${config.smtp_port || 587}
          - TLS: ${config.use_tls ? 'Enabled' : 'Disabled'}
          
          Timestamp: ${new Date().toISOString()}
          
          If you received this email, your SMTP configuration is working correctly! ✅
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">🧪 IT Infrastructure Manager - Test Email</h2>
            <p>This is a test email from IT Infrastructure Manager.</p>
            
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">SMTP Configuration</h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li><strong>Host:</strong> ${config.smtp_host}</li>
                <li><strong>Port:</strong> ${config.smtp_port || 587}</li>
                <li><strong>TLS:</strong> ${config.use_tls ? 'Enabled' : 'Disabled'}</li>
              </ul>
            </div>
            
            <p style="color: #64748b; font-size: 12px;">
              Timestamp: ${new Date().toISOString()}
            </p>
            
            <p style="color: #22c55e; font-weight: bold;">
              ✅ If you received this email, your SMTP configuration is working correctly!
            </p>
          </div>
        `,
      });

      await client.close();

      const latencyMs = Date.now() - startTime;

      // Log test result
      await supabase.from("connection_test_runs").insert({
        domain_id,
        module: "mail",
        mail_config_id: config_id,
        status: "success",
        message: `Test email sent successfully to ${recipient_email}`,
        latency_ms: latencyMs,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Test email sent successfully to ${recipient_email}`,
          latency_ms: latencyMs,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (smtpError: any) {
      if (client) {
        try { await client.close(); } catch {}
      }

      const latencyMs = Date.now() - startTime;

      // Log failure
      await supabase.from("connection_test_runs").insert({
        domain_id,
        module: "mail",
        mail_config_id: config_id,
        status: "fail",
        message: smtpError.message || "SMTP connection failed",
        latency_ms: latencyMs,
        error_details: { error: smtpError.message, stack: smtpError.stack },
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: smtpError.message || "SMTP connection failed",
          latency_ms: latencyMs,
          error_details: smtpError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("Error in send-test-email:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
