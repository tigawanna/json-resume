import { schema } from "@repo/db/schema/index";
import { drizzle } from "drizzle-orm/libsql/node";

import { env } from "@api/env";

/**
 * Shared libsql database client. Only the auth tables live here for now; the
 * remaining schema moves into `@repo/db` as its routes migrate off TanStack Start.
 */
export const db = drizzle({
  connection: {
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  },
  schema,
});
