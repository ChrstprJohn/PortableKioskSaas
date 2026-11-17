import test from "node:test";
import assert from "node:assert/strict";
import { databaseConfig } from "./lib/database.mjs";
const env = {
  DATABASE_HOST: "localhost",
  DATABASE_USER: "postgres",
  DATABASE_NAME: "postgres",
  DATABASE_PASSWORD: "test",
};
test("database connections require validated TLS and separate credentials", () => {
  const config = databaseConfig(env);
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.password, "test");
  assert.equal(config.port, 5432);
  assert.throws(
    () => databaseConfig({ ...env, DATABASE_PASSWORD: "" }),
    /Missing DATABASE_PASSWORD/,
  );
  assert.throws(
    () => databaseConfig({ ...env, DATABASE_PORT: "invalid" }),
    /Invalid DATABASE_PORT/,
  );
});
