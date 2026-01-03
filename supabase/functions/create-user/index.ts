import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  fullNameAr?: string;
  phone?: string;
  hospitalId?: string;
  roles?: Array<{ role: string; hospitalId?: string }>;
  customRoles?: Array<{ roleCode: string; hospitalId?: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userProfile, error: profileCheckError } = await supabaseClient
      .from('profiles')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .maybeSingle();

    const allowedRoles = ['platform_owner', 'platform_admin', 'tenant_admin', 'maintenance_manager', 'global_admin', 'hospital_admin'];
    const hasAdminAccess = userProfile?.is_super_admin ||
                           (userProfile?.role && allowedRoles.includes(userProfile.role));

    if (profileCheckError || !hasAdminAccess) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, fullName, fullNameAr, phone, hospitalId, roles, customRoles } = await req.json() as CreateUserRequest;

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      }
    });

    if (createError || !newUser.user) {
      return new Response(
        JSON.stringify({ error: createError?.message || 'Failed to create user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email,
        full_name: fullName,
        full_name_ar: fullNameAr,
        phone,
        tenant_id: hospitalId,
        role: roles?.[0]?.role || 'technician',
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    if (roles && roles.length > 0) {
      const roleInserts = roles.map(r => ({
        user_id: newUser.user.id,
        role: r.role,
        hospital_id: r.hospitalId,
      }));

      const { error: rolesInsertError } = await adminClient
        .from('user_roles')
        .insert(roleInserts);

      if (rolesInsertError) {
        console.error('Roles assignment error:', rolesInsertError);
      }
    }

    if (customRoles && customRoles.length > 0) {
      const customRoleInserts = customRoles.map(r => ({
        user_id: newUser.user.id,
        role_code: r.roleCode,
        hospital_id: r.hospitalId,
      }));

      const { error: customRolesError } = await adminClient
        .from('custom_user_roles')
        .insert(customRoleInserts);

      if (customRolesError) {
        console.error('Custom roles assignment error:', customRolesError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});