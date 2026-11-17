import { schema } from "@repo/db/schema/index";
import { drizzle } from "drizzle-orm/libsql/node";
import { type AppDb, createDb } from "@api/db/client";

/**
 * Throwaway `file:` databases need the native client. That stays in tests; the
 * app ships the HTTP client. A remote `TEST_DATABASE_URL` uses the app's client.
 */
export function createTestDb({ url }: { url: string }): AppDb {
  if (!url.startsWith("file:")) return createDb({ url });
  return drizzle({ connection: { url }, schema });
}
