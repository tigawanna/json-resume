import type { AuthSession } from "@hono-api/core/auth/auth";
import type { AuditableLogger } from "evlog";

/** Typed Hono context: evlog's auditable request logger plus the authenticated session. */
export type AppEnv = {
  Variables: {
    log: AuditableLogger;
    session: AuthSession;
  };
};
