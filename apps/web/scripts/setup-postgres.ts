import { Pool } from "pg";

const databaseUrl =
  process.env.E2E_POSTGRES_URL ??
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:55439/ajr_web_e2e";
const parsed = new URL(databaseUrl);
const databaseName = parsed.pathname.slice(1);
if (!/^[a-z0-9_]+$/.test(databaseName)) {
  throw new Error(`Unsafe E2E database name: ${databaseName}`);
}
parsed.pathname = "/postgres";
const admin = new Pool({ connectionString: parsed.toString(), max: 1 });

try {
  await admin.query("select pg_terminate_backend(pid) from pg_stat_activity where datname = $1", [
    databaseName,
  ]);
  await admin.query(`drop database if exists "${databaseName}"`);
  await admin.query(`create database "${databaseName}"`);
  console.log(`Prepared Postgres database ${databaseName}`);
} finally {
  await admin.end();
}
