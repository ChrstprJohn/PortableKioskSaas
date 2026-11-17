import pg from "pg";
import { databaseConfig } from "../../../scripts/lib/database.mjs";

export const pool = new pg.Pool({
  ...databaseConfig(),
  max: 5,
  idleTimeoutMillis: 10000,
});
pool.on("error", (error) =>
  console.error("Idle database connection failed:", error.code || "unknown"),
);
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
