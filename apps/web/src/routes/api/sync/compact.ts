import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { compactUserLibrary } from "@/modules/sync/compact.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Called by the client after a push drains: merge duplicates the push introduced. */
export const Route = createFileRoute("/api/sync/compact")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);
        const result = await compactUserLibrary(session.user.id);
        return json(result);
      },
    },
  },
});
