import path from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { initLogger } from "evlog";
import { createFsDrain } from "evlog/fs";
import { evlog, type EvlogVariables } from "evlog/hono";
import { auth } from "@api/auth/auth";
import { env } from "@api/env";
import { errorResponse } from "@api/lib/http";
import { healthRoute } from "@api/routes/health/route";
import { meRoute } from "@api/routes/me/route";
import { viewerRoute } from "@api/routes/viewer/route";

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
        if (!origin) return origin;
        return env.TRUSTED_ORIGINS.includes(origin) ? origin : env.FRONTEND_URL;
      },
      credentials: true,
    }),
  )
  // Better Auth owns everything under /api/auth/*.
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
  .route("/health", healthRoute)
  .route("/viewer", viewerRoute)
  .route("/me", meRoute)
  .onError((error, c) => errorResponse({ c, error, isProduction }));

export type AppType = typeof app;
