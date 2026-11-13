import type { RequestLogger } from "evlog";
import type { AuthSession } from "@api/auth/auth";

/** Typed Hono context: evlog's request logger plus the authenticated session. */
export type AppEnv = {
  Variables: {
    log: RequestLogger;
    session: AuthSession;
  };
};
