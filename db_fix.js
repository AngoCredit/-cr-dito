import pg from 'pg';
import fs from 'fs';

const connectionString = "postgresql://postgres:MPLA1975mpla#@db.zqjrdbytakszqqouazue.supabase.co:5432/postgres";
const sql = fs.readFileSync('repair_db.sql', 'utf8');

const client = new pg.Client({ connectionString });

async function main() {
    try {
        await client.connect();
        console.log("Connected to DB");
        // Split SQL by ; to execute one by one if needed, but client.query usually handles multi-statement if it's the right driver
        // In pg, client.query(sql) handles multiple statements.
        await client.query(sql);
        console.log("SQL executed successfully");
    } catch (err) {
        console.error("Error executing SQL:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
