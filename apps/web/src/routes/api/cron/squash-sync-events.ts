import { createFileRoute } from "@tanstack/react-router";
import { serverEnv } from "@/lib/server-env";
import { squashSyncEvents } from "@/modules/sync/squash.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isAuthorizedCron(request: Request): boolean {
  const secret = serverEnv.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? request.headers.get("x-cron-secret") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : header;
  return token === secret;
}

async function squash(request: Request): Promise<Response> {
  if (!serverEnv.CRON_SECRET) {
    return json({ error: "CRON_SECRET is not configured" }, 503);
  }
  if (!isAuthorizedCron(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  return json(await squashSyncEvents());
}

/** Prunes superseded events older than a day across every user's log. */
export const Route = createFileRoute("/api/cron/squash-sync-events")({
  server: {
    handlers: {
      // Vercel Cron invokes the path with GET and Authorization: Bearer $CRON_SECRET.
      GET: async ({ request }: { request: Request }) => squash(request),
      POST: async ({ request }: { request: Request }) => squash(request),
    },
  },
});
