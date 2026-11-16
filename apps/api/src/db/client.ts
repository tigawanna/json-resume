import { schema } from "@repo/db/schema/index";
import { drizzle } from "drizzle-orm/libsql/node";
import { EnhancedQueryLogger } from "drizzle-query-logger";
import { env } from "@api/env";

export type AppDb = ReturnType<typeof createDb>;

/** Build a database client for a URL. The app root and tests both use this. */
export function createDb({ url, authToken }: { url: string; authToken?: string }) {
  return drizzle({
    connection: { url, authToken },
    schema,
    logger: new EnhancedQueryLogger(),
  });
}

let activeDb: AppDb | undefined;

/** Replace the process-wide client. `createApp` calls this once at the root. */
export function setDb({ db }: { db: AppDb }) {
  activeDb = db;
}

/** Lazily build the production client from env when nothing was injected. */
export function getDb(): AppDb {
  activeDb ??= createDb({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  });
  return activeDb;
}

/**
 * Modules import `db` directly. The proxy keeps those call sites unchanged
 * while routing every query to the instance injected by `createApp`.
 */
export const db: AppDb = new Proxy({} as AppDb, {
  get(_target, property) {
    const target = getDb();
    const value = Reflect.get(target, property, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
