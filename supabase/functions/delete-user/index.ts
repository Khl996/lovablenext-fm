import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create client with anon key + user's auth token to check permissions
    const userClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Extract JWT token and get the current user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Check if user is admin using service role client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error checking roles:', rolesError);
      throw new Error('Error checking permissions');
    }

    const isAdmin = roles?.some(
      (r: any) => r.role === 'global_admin' || r.role === 'hospital_admin'
    );

    if (!isAdmin) {
      throw new Error('Permission denied: Only admins can delete users');
    }

    console.log('Admin permission verified');

    const { userId }: DeleteUserRequest = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`Admin ${user.id} deleting user ${userId}`);

    // Delete related records first (in order of dependencies)
    // 1. Delete from user_roles
    const { error: deleteRolesError } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    if (deleteRolesError) {
      console.error('Error deleting user roles:', deleteRolesError);
      throw new Error(`Failed to delete user roles: ${deleteRolesError.message}`);
    }

    // 2. Delete from user_permissions (if exists)
    const { error: deletePermsError } = await adminClient
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);
    
    if (deletePermsError && deletePermsError.code !== 'PGRST116') { // Ignore "no rows" error
      console.error('Error deleting user permissions:', deletePermsError);
      throw new Error(`Failed to delete user permissions: ${deletePermsError.message}`);
    }

    // 3. Delete from team_members
    const { error: deleteTeamError } = await adminClient
      .from('team_members')
      .delete()
      .eq('user_id', userId);
    
    if (deleteTeamError && deleteTeamError.code !== 'PGRST116') {
      console.error('Error deleting team members:', deleteTeamError);
      throw new Error(`Failed to delete team members: ${deleteTeamError.message}`);
    }

    // 4. Delete from profiles
    const { error: deleteProfileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (deleteProfileError) {
      console.error('Error deleting profile:', deleteProfileError);
      throw new Error(`Failed to delete profile: ${deleteProfileError.message}`);
    }

    // 5. Finally delete user from auth
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      throw new Error(`Failed to delete auth user: ${deleteAuthError.message}`);
    }

    console.log(`User ${userId} deleted successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in delete-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: error.message.includes('Permission denied') ? 403 : 500 
      }
    );
  }
});