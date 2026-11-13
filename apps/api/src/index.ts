import { serve } from "@hono/node-server";
import { app } from "@api/app";
import { env } from "@api/env";

export type { AppType } from "@api/app";
export { app };

// Local Node server only. Serverless hosts import `app` and wrap `app.fetch`.
if (!process.env.VERCEL) {
  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.log(`API running on http://localhost:${info.port}`);
  });
}
