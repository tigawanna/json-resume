import path from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { initLogger } from "evlog";
import { createFsDrain } from "evlog/fs";
import { evlog, type EvlogVariables } from "evlog/hono";
import { auth } from "@api/auth/auth";
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
 * The API surface. Keep this a single chained expression: `AppType` is inferred
 * from it, and that type is what gives the web client end-to-end safety.
 */
export const app = new Hono<EvlogVariables>()
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

export type AppType = typeof app;
