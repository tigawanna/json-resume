import { createFileRoute } from "@tanstack/react-router";
import { serverEnv } from "@/lib/server-env";
import { projectUnappliedSyncEvents } from "@/modules/sync/project-legacy.server";

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

async function projectSyncEvents(request: Request): Promise<Response> {
  if (!serverEnv.CRON_SECRET) {
    return json({ error: "CRON_SECRET is not configured" }, 503);
  }
  if (!isAuthorizedCron(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  const result = await projectUnappliedSyncEvents(500);
  return json(result);
}

export const Route = createFileRoute("/api/cron/project-sync-events")({
  server: {
    handlers: {
      // Vercel Cron invokes the path with GET and Authorization: Bearer $CRON_SECRET.
      GET: async ({ request }: { request: Request }) => projectSyncEvents(request),
      POST: async ({ request }: { request: Request }) => projectSyncEvents(request),
    },
  },
});
