import { auth } from "@/lib/auth";
import { oAuthProtectedResourceMetadata } from "better-auth/plugins";
import { createFileRoute } from "@tanstack/react-router";

const handler = oAuthProtectedResourceMetadata(auth);

export const Route = createFileRoute(
  "/.well-known/oauth-protected-resource",
)({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handler(request),
    },
  },
});
