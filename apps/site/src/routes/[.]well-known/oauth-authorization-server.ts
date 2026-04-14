import { auth } from "@/lib/auth";
import { oAuthDiscoveryMetadata } from "better-auth/plugins";
import { createFileRoute } from "@tanstack/react-router";

const handler = oAuthDiscoveryMetadata(auth);

export const Route = createFileRoute("/.well-known/oauth-authorization-server")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handler(request),
    },
  },
});
