import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { withDatabase, reportFailure } from "./lib/database.mjs";
try {
  for (const key of [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
  ])
    assert.ok(process.env[key], `Missing ${key}`);
  const publicResponse = await fetch(
    `${process.env.SUPABASE_URL}/auth/v1/settings`,
    {
      headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(15000),
    },
  );
  assert.equal(publicResponse.status, 200, "Publishable key check failed");
  console.log("PASS: Supabase HTTPS endpoint and publishable key");
  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw error;
  console.log("PASS: Backend secret authenticated (no user data displayed)");
  await withDatabase(async (client) => {
    const { rows } = await client.query(
      "select current_database() as database, current_user as role, now() as server_time",
    );
    assert.equal(rows[0].database, process.env.DATABASE_NAME);
    console.log("PASS: Verified TLS PostgreSQL connection and SQL execution");
    console.table(rows);
    await client.query("begin");
    try {
      await client.query(
        "create temporary table kiosk_connection_probe (value integer) on commit drop",
      );
      await client.query("insert into kiosk_connection_probe values (1)");
      const result = await client.query(
        "select value from kiosk_connection_probe",
      );
      assert.equal(result.rows[0].value, 1);
      console.log(
        "PASS: Temporary-table create / insert / select (rolled back; no persistent schema changes)",
      );
    } finally {
      await client.query("rollback");
    }
  });
} catch (error) {
  reportFailure(error);
}
