import { Pool } from "pg";
import { schema } from "@repo/db/postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import type { TestDatabase } from "./create-test-app.js";

function databaseNameOf({ url }: { url: string }) {
  const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  if (!/^[a-z0-9_]+$/i.test(name)) throw new Error("Invalid source database name");
  return name;
}

/** Clone a migrated local Postgres snapshot without touching the source database. */
export async function copyLocalDatabase(): Promise<TestDatabase> {
  const sourceUrl = process.env.NEST_TEST_POSTGRES_SOURCE;
  if (!sourceUrl) {
    throw new Error("NEST_TEST_POSTGRES_SOURCE must point to a migrated Postgres snapshot");
  }
  const sourceName = databaseNameOf({ url: sourceUrl });
  const databaseName = `nest_snapshot_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: sourceUrl, max: 1 });
  let pool: Pool | undefined;
  try {
    await admin.query(`CREATE DATABASE "${databaseName}" WITH TEMPLATE "${sourceName}"`);
    const url = new URL(sourceUrl);
    url.pathname = `/${databaseName}`;
    pool = new Pool({ connectionString: url.toString(), max: 2 });
    const db = drizzle({ client: pool, schema });
    const activePool = pool;
    return {
      db,
      async close() {
        await activePool.end();
        await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
        await admin.end();
      },
    };
  } catch (error: unknown) {
    await pool?.end();
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin.end();
    throw error;
  }
}
