import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.5";

const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ApplyRBACApprovalPayload {
  approval_request_id: string;
}

serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { approval_request_id } = (await req.json()) as ApplyRBACApprovalPayload;

    if (!approval_request_id) {
      return new Response(
        JSON.stringify({ error: "approval_request_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch the approval request
    const { data: approval, error: approvalError } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("id", approval_request_id)
      .single();

    if (approvalError || !approval) {
      return new Response(
        JSON.stringify({ error: "Approval request not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Only apply if approved
    if (approval.status !== "approved") {
      return new Response(
        JSON.stringify({ error: "Approval must be in 'approved' status" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle role assignment creation
    if (approval.entity_type === "role_assignment" && approval.action_type === "create") {
      const requestData = approval.request_data as any;

      const { data: newAssignment, error: insertError } = await supabase
        .from("role_assignments")
        .insert({
          user_id: requestData.user_id,
          role_id: requestData.role_id,
          scope_type: requestData.scope_type,
          scope_id: requestData.scope_id,
          notes: requestData.notes || null,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create role assignment: ${insertError.message}`);
      }

      // Update approval status to 'applied'
      const { error: updateError } = await supabase
        .from("approval_requests")
        .update({ status: "applied" })
        .eq("id", approval_request_id);

      if (updateError) {
        throw new Error(`Failed to update approval status: ${updateError.message}`);
      }

      // Log audit entry
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", approval.decided_by)
        .single();

      await supabase.from("audit_logs").insert({
        action: "rbac.assign",
        table_name: "role_assignments",
        record_id: newAssignment.id,
        old_data: null,
        new_data: newAssignment,
        user_id: approval.decided_by,
        user_name: profile?.full_name,
        user_email: profile?.email,
        approval_request_id: approval_request_id,
        entity_name: "Role Assignment",
      });

      // Send notification to requester
      const { data: requesterProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", approval.requested_by)
        .single();

      if (requesterProfile) {
        await supabase.from("notifications").insert({
          user_id: requesterProfile.user_id,
          title: "Role Assignment Approved",
          message: `Your role assignment request has been approved and applied.`,
          severity: "info",
          code: "APPROVAL_APPLIED",
          entity_type: "role_assignment",
          entity_id: newAssignment.id,
          site_id: approval.site_id,
          domain_id: approval.domain_id,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Role assignment created and approval applied",
          assignment_id: newAssignment.id,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unsupported approval type" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error applying approval:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
