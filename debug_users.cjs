const { Client } = require('pg');

const connectionString = "postgresql://postgres:MPLA1975mpla%23@db.zqjrdbytakszqqouazue.supabase.co:5432/postgres";

async function main() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected to the CORRECT DB (zqjrdbytakszqqouazue)");

        const res = await client.query('SELECT user_id, nome, email, referral_code FROM public.profiles');
        console.log("PROFILES DATA:");
        console.log(JSON.stringify(res.rows, null, 2));

        const authRes = await client.query('SELECT id, email FROM auth.users');
        console.log("AUTH USERS DATA:");
        console.log(JSON.stringify(authRes.rows, null, 2));

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();
