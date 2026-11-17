import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { withDatabase, reportFailure } from "./lib/database.mjs";

try {
  await withDatabase(async (client) => {
    await client.query(
      "select pg_advisory_lock(hashtext('portable-kiosk-migrations'))",
    );
    try {
      await client.query("create schema if not exists kiosk_private");
      await client.query(
        "revoke all on schema kiosk_private from public, anon, authenticated",
      );
      await client.query(
        "create table if not exists kiosk_private.migrations (name text primary key, hash text not null, applied_at timestamptz not null default now())",
      );
      for (const name of (await readdir("supabase/migrations"))
        .filter((n) => n.endsWith(".sql"))
        .sort()) {
        const sql = await readFile(`supabase/migrations/${name}`, "utf8");
        const hash = createHash("sha256").update(sql).digest("hex");
        const existing = await client.query(
          "select hash from kiosk_private.migrations where name=$1",
          [name],
        );
        if (existing.rows.length) {
          if (existing.rows[0].hash !== hash)
            throw new Error(`Applied migration changed: ${name}`);
          console.log(`Already applied: ${name}`);
          continue;
        }
        await client.query("begin");
        try {
          await client.query(sql);
          await client.query(
            "insert into kiosk_private.migrations(name,hash) values ($1,$2)",
            [name, hash],
          );
          await client.query("commit");
          console.log(`Applied: ${name}`);
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
      }
    } finally {
      await client.query(
        "select pg_advisory_unlock(hashtext('portable-kiosk-migrations'))",
      );
    }
  });
} catch (error) {
  reportFailure(error);
}
