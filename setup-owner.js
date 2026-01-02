import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://reusvpiskouwdfguftnk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Please run: export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createPlatformOwner() {
  try {
    console.log('Creating platform owner account...');

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'khalid.a.kh990@gmail.com',
      password: 'Khalid@5452',
      email_confirm: true,
      user_metadata: {
        full_name: 'Khalid',
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError.message);
      return;
    }

    console.log('✓ Auth user created:', authData.user.id);

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: 'khalid.a.kh990@gmail.com',
        full_name: 'Khalid',
        full_name_ar: 'خالد',
        is_super_admin: true,
        role: 'platform_owner',
      });

    if (profileError) {
      console.error('Error creating profile:', profileError.message);
      return;
    }

    console.log('✓ Profile created with platform owner privileges');
    console.log('\nPlatform owner account created successfully!');
    console.log('Email: khalid.a.kh990@gmail.com');
    console.log('You can now log in to the platform.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createPlatformOwner();
