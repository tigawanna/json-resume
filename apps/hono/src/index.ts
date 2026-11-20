import { serve } from "@hono/node-server";

import { env } from "@hono-api/env";
import { createApp } from "./app";
import { createDb } from "./core/db/client";

const app = createApp({
  db: createDb({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  }),
});



type AppType = typeof app;
export { app, type AppType };

// Local Node server only. Serverless hosts import `app` and wrap `app.fetch`.
if (!process.env.VERCEL) {
  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.log(`API running on http://localhost:${info.port}`);
  });
}
