import path from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { initLogger } from "evlog";
import { createFsDrain } from "evlog/fs";
import { evlog, type EvlogVariables } from "evlog/hono";
import { type Auth, getAuth, setAuth } from "@api/auth/auth";
import { type AppDb, getDb, setDb } from "@api/db/client";
import { env } from "@api/env";
import { errorBody, errorResponse } from "@api/lib/http";
import { healthRoute } from "@api/routes/health/route";
import { meRoute } from "@api/routes/me/route";
import { waitlistAdminRoute } from "@api/routes/admin/waitlist";
import { creditsAdminRoute } from "@api/routes/admin/credits";
import { creditsRoute } from "@api/routes/credits/route";
import { waitlistRoute } from "@api/routes/waitlist/route";
import { viewerRoute } from "@api/routes/viewer/route";
import { syncEventsRoute } from "@api/routes/sync/events";
import { syncCompactRoute } from "@api/routes/sync/compact";
import { projectSyncEventsRoute } from "@api/routes/cron/project-sync-events";
import { squashSyncEventsRoute } from "@api/routes/cron/squash-sync-events";

const isProduction = env.NODE_ENV === "production";

initLogger({
  env: {
    service: "agentic-json-resume-api",
    environment: env.NODE_ENV,
  },
});

/**
 * Build the API surface with explicit dependencies. The routes import the
 * process-wide `db`/`auth` accessors, so the root registers the instances here;
 * tests call this factory with a throwaway database instead of env.
 */
export function createApp({ db, auth }: { db: AppDb; auth: Auth }) {
  setDb({ db });
  setAuth({ auth });

  /**
   * Keep this a single chained expression: `AppType` is inferred from it, and
   * that type is what gives the web client end-to-end safety.
   */
  return new Hono<EvlogVariables>()
    .basePath("/api")
    .use(
      "*",
      evlog({
        // Dev-only NDJSON wide events for local debugging; serverless FS is read-only.
        drain: isProduction
          ? undefined
          : createFsDrain({ dir: path.resolve(process.cwd(), env.EVLOG_DIR), maxFiles: 14 }),
      }),
    )
    .use(
      "*",
      cors({
        origin: (origin) => {
          if (!origin) return null;
          return env.TRUSTED_ORIGINS.includes(origin) ? origin : null;
        },
        credentials: true,
      }),
    )
    // Better Auth owns everything under /api/auth/*.
    .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
    .route("/health", healthRoute)
    .route("/viewer", viewerRoute)
    .route("/me", meRoute)
    .route("/sync/events", syncEventsRoute)
    .route("/sync/compact", syncCompactRoute)
    .route("/cron/project-sync-events", projectSyncEventsRoute)
    .route("/cron/squash-sync-events", squashSyncEventsRoute)
    .route("/waitlist", waitlistRoute)
    .route("/admin/waitlist", waitlistAdminRoute)
    .route("/credits", creditsRoute)
    .route("/admin/credits", creditsAdminRoute)
    .notFound((c) => c.json(errorBody({ message: "Not Found", code: "NOT_FOUND" }), 404))
    .onError((error, c) => errorResponse({ c, error, isProduction }));
}

export const app = createApp({ db: getDb(), auth: getAuth() });

export type AppType = typeof app;
