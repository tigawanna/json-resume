import type { AppType } from "@api/app";
import { hc } from "hono/client";
import { clientEnv } from "@/lib/env/client-env";

/**
 * Typed Hono RPC client for `apps/api`.
 *
 * `import type` keeps the API server entry out of the browser bundle. The API
 * runs on its own origin, so requests send the session cookie via
 * `credentials: "include"` (see the CORS + trusted-origin setup in `apps/api`).
 */
export const honoClient = hc<AppType>(clientEnv.VITE_HONO_API_URL, {
  init: {
    credentials: "include",
  },
});
