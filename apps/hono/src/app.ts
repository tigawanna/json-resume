import { initLogger } from "evlog";
import { createFsDrain } from "evlog/fs";
import { evlog, type EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import path from "node:path";
import { createAuth } from "./core/auth/auth";
import { AuthService } from "./core/auth/auth.service";
import { AppDb } from "./core/db/client";
import { env } from "./env";
import { errorBody, errorResponse } from "./lib/http";
import { createRoutes } from "./modules";

const isProduction = env.NODE_ENV === "production";

initLogger({
  env: {
    service: "agentic-json-resume-api",
    environment: env.NODE_ENV,
  },
});

type AppProps = {
  db: AppDb;
};

export function createApp({ db }: AppProps) {
  const auth = createAuth({ db });
  const authService = new AuthService({ auth });

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
      .route("/", createRoutes({ auth: authService }))
      .notFound((c) => c.json(errorBody({ message: "Not Found", code: "NOT_FOUND" }), 404))
      .onError((error, c) => errorResponse({ c, error, isProduction }))
  );
}
