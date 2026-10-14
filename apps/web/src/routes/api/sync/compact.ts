import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";
import { compactionProposalSchema } from "@/modules/sync/plan/compaction-protocol";
import { acceptCompaction } from "@/modules/sync/server/compaction.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A device's planned library compaction: appended if the log has not moved past it, else stale. */
export const Route = createFileRoute("/api/sync/compact")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);
        const parsed = compactionProposalSchema.safeParse(await request.json());
        if (!parsed.success) {
          return json({ error: "Invalid compaction proposal", issues: parsed.error.issues }, 400);
        }
        return json(await acceptCompaction(session.user.id, parsed.data));
      },
    },
  },
});
