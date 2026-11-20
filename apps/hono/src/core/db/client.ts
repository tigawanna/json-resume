import { schema } from "@repo/db/schema/index";
import { drizzle } from "drizzle-orm/libsql/web";
import { EnhancedQueryLogger } from "drizzle-query-logger";

export type AppDb = ReturnType<typeof createDb>;

/**
 * Build a database client for a remote URL (`libsql://`, `https://`, `http://`).
 * The HTTP client has no native binding, so any bundler or host can ship it.
 */
export function createDb({ url, authToken }: { url: string; authToken?: string }) {
  return drizzle({
    connection: { url, authToken },
    schema,
    logger: new EnhancedQueryLogger(),
  });
}
