import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SetupRequest {
  email: string;
  password: string;
  fullName: string;
  fullNameAr?: string;
  setupKey: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, password, fullName, fullNameAr, setupKey }: SetupRequest = await req.json();

    if (setupKey !== Deno.env.get('SETUP_KEY')) {
      return new Response(
        JSON.stringify({ error: 'Invalid setup key' }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('is_super_admin', true)
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Platform owner already exists' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      }
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: authError?.message || 'Failed to create user' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        full_name_ar: fullNameAr || fullName,
        is_super_admin: true,
        role: 'platform_owner',
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to create profile' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Platform owner created successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});