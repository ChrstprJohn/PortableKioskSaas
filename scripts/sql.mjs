import { readFile } from "node:fs/promises";
import { withDatabase, reportFailure } from "./lib/database.mjs";
const args = process.argv.slice(2);
const execute = args[0] === "--execute";
const file = args[execute ? 1 : 0];
if (!file || args.length !== (execute ? 2 : 1)) {
  console.error("Usage: npm run db:sql -- [--execute] path/to/query.sql");
  process.exitCode = 1;
} else {
  try {
    const sql = await readFile(file, "utf8");
    await withDatabase(async (client) => {
      // Default transaction is read-only. SQL files are trusted local developer inputs.
      await client.query(execute ? "begin" : "begin read only");
      try {
        const result = await client.query(sql);
        for (const item of Array.isArray(result) ? result : [result]) {
          if (item.rows?.length) console.table(item.rows);
          else console.log(`${item.command}: ${item.rowCount ?? 0} rows`);
        }
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  } catch (error) {
    reportFailure(error);
  }
}
