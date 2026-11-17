import { serve } from "@hono/node-server";
import { app } from "@repo/api/app";

const port = Number(process.env.PORT ?? 8080);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API listening on ${info.port}`);
});
