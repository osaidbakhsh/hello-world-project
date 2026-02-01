import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if caller is admin using user_roles table (more secure)
    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!callerRole || !['super_admin', 'admin'].includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { 
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { email, password, full_name, department, position, phone, role, domain_ids } = await req.json()

    // Validate required fields
    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, full_name' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Prevent non-super_admin from creating super_admin accounts
    if (role === 'super_admin' && callerRole?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Only Super Admin can create Super Admin accounts' }), { 
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create user with admin privileges (bypasses signup disabled)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { 
        full_name, 
        role: role || 'employee' 
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(JSON.stringify({ error: createError.message }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update profile with additional info (trigger creates the profile)
    if (newUser.user) {
      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Get the created profile
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', newUser.user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
      }
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          department: department || 'IT',
          position: position || null,
          phone: phone || null,
        })
        .eq('user_id', newUser.user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
      }

      // Create domain memberships if domain_ids provided
      if (newProfile && domain_ids && Array.isArray(domain_ids) && domain_ids.length > 0) {
        const memberships = domain_ids.map((domainId: string) => ({
          profile_id: newProfile.id,
          domain_id: domainId,
          can_edit: role === 'admin' || role === 'super_admin',
        }))

        const { error: membershipError } = await supabaseAdmin
          .from('domain_memberships')
          .insert(memberships)

        if (membershipError) {
          console.error('Error creating domain memberships:', membershipError)
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: newUser.user?.id,
      message: 'Employee created successfully'
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
