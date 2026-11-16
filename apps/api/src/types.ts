import type { AuditableLogger } from "evlog";
import type { AuthSession } from "@api/auth/auth";

/** Typed Hono context: evlog's auditable request logger plus the authenticated session. */
export type AppEnv = {
  Variables: {
    log: AuditableLogger;
    session: AuthSession;
  };
};
