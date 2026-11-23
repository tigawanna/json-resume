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
import { AdminController } from "@api/modules/admin/admin.controller";
import { CreditsController } from "@api/modules/credits/credits.controller";
import { CronController } from "@api/modules/cron/cron.controller";
import { HealthController } from "@api/modules/health/health.controller";
import { MeController } from "@api/modules/me/me.controller";
import { OidcController } from "@api/modules/oidc/oidc.controller";
import { SyncController } from "@api/modules/sync/sync.controller";
import { ViewerController } from "@api/modules/viewer/viewer.controller";
import { WaitlistController } from "@api/modules/waitlist/waitlist.controller";
import { WalletController } from "@api/modules/wallet/wallet.controller";

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
  const sync = container.resolve({ token: SyncController });
  const cron = container.resolve({ token: CronController });
  const waitlist = container.resolve({ token: WaitlistController });
  const admin = container.resolve({ token: AdminController });
  const wallet = container.resolve({ token: WalletController });
  const credits = container.resolve({ token: CreditsController });

  /**
   * Keep this a single chained expression: `AppType` is inferred from it, and
   * that type is what gives the web client end-to-end safety.
   */
  return (
    new Hono<EvlogVariables>()
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
      .route("/sync", sync.routes)
      .route("/cron", cron.routes)
      .route("/waitlist", waitlist.routes)
      .route("/admin", admin.routes)
      .route("/wallet", wallet.routes)
      .route("/credits", credits.routes)
      .notFound((c) => c.json(errorBody({ message: "Not Found", code: "NOT_FOUND" }), 404))
      .onError((error, c) => errorResponse({ c, error, isProduction }))
  );
}

const api = createApp({ db: getDb(), auth: getAuth() });
const oidc = new OidcController();

/** Discovery sits outside `/api` so API Gateway can load `{issuer}/.well-known/openid-configuration`. */
export const app = new Hono()
  .route("/", oidc.routes)
  .route("/", api)
  .notFound((c) => c.json(errorBody({ message: "Not Found", code: "NOT_FOUND" }), 404));

export type AppType = typeof api;
