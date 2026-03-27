import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testLogin() {
    console.log('1. Attempting login...');
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'bytekwanza@gmail.com',
        password: '#bytekwanza2026@',
    });

    if (error) {
        console.error('Login Failed:', error.message);
        return;
    }

    console.log('Login Success! User ID:', data.user.id);

    console.log('\n2. Fetching profile for user...');
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, must_change_password')
        .eq('user_id', data.user.id)
        .single();

    if (profileError) {
        console.error('Profile query error:', profileError);
    } else {
        console.log('Profile data:', profile);
    }
}

testLogin();
