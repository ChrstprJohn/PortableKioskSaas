import pg from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export function databaseConfig(env = process.env) {
  for (const key of [
    "DATABASE_HOST",
    "DATABASE_USER",
    "DATABASE_NAME",
    "DATABASE_PASSWORD",
  ]) {
    if (!env[key]) throw new Error(`Missing ${key}`);
  }
  const port = Number(env.DATABASE_PORT || 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid DATABASE_PORT");
  return {
    host: env.DATABASE_HOST,
    port,
    user: env.DATABASE_USER,
    database: env.DATABASE_NAME,
    password: env.DATABASE_PASSWORD,
    ssl: {
      rejectUnauthorized: true,
      ...(env.DATABASE_SSL_CA_FILE
        ? {
            ca: readFileSync(
              resolve(
                fileURLToPath(new URL("../../", import.meta.url)),
                env.DATABASE_SSL_CA_FILE,
              ),
              "utf8",
            ),
          }
        : {}),
    },
    connectionTimeoutMillis: 15000,
    statement_timeout: 15000,
    application_name: "portable-kiosk-workspace",
  };
}
export async function withDatabase(fn) {
  const client = new pg.Client(databaseConfig());
  try {
    await client.connect();
    return await fn(client);
  } finally {
    await client.end();
  }
}
export function reportFailure(error) {
  // Do not print connection strings, credentials, or full driver error objects.
  console.error(
    `Operation failed (${error.code || error.name || "unknown"}). Check credentials, network, and TLS configuration.`,
  );
  process.exitCode = 1;
}
