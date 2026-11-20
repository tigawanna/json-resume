import path from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { initLogger } from "evlog";
import { createFsDrain } from "evlog/fs";
import { evlog, type EvlogVariables } from "evlog/hono";
import { type Auth, getAuth, setAuth } from "@api/auth/auth";
import { type AppDb, getDb, setDb } from "@api/db/client";
import { env } from "@api/env";
import { createAppContainer } from "@api/core/di/create-app-container";
import { errorBody, errorResponse } from "@api/lib/http";
import { HealthController } from "@api/modules/health/health.controller";
import { MeController } from "@api/modules/me/me.controller";
import { ViewerController } from "@api/modules/viewer/viewer.controller";
import { adminRoute } from "@api/routes/admin";
import { creditsRoute } from "@api/routes/credits";
import { walletRoute } from "@api/routes/wallet";
import { waitlistRoute } from "@api/routes/waitlist/route";
import { syncRoute } from "@api/routes/sync";
import { cronRoute } from "@api/routes/cron";
import { oidcDiscoveryRoute } from "@api/routes/oidc/discovery";

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

  const container = createAppContainer({ db, auth });
  const health = container.resolve({ token: HealthController });
  const viewer = container.resolve({ token: ViewerController });
  const me = container.resolve({ token: MeController });

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
    .route("/health", health.routes)
    .route("/viewer", viewer.routes)
    .route("/me", me.routes)
    .route("/sync", syncRoute)
    .route("/cron", cronRoute)
    .route("/waitlist", waitlistRoute)
    .route("/admin", adminRoute)
    .route("/wallet", walletRoute)
    .route("/credits", creditsRoute)
    .notFound((c) => c.json(errorBody({ message: "Not Found", code: "NOT_FOUND" }), 404))
    .onError((error, c) => errorResponse({ c, error, isProduction }));
}

const api = createApp({ db: getDb(), auth: getAuth() });

/** Discovery sits outside `/api` so API Gateway can load `{issuer}/.well-known/openid-configuration`. */
export const app = new Hono()
  .route("/", oidcDiscoveryRoute)
  .route("/", api)
  .notFound((c) => c.json(errorBody({ message: "Not Found", code: "NOT_FOUND" }), 404));

export type AppType = typeof api;
