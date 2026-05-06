import { auth } from "@/lib/auth";
import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { createFileRoute } from "@tanstack/react-router";

const handler = oauthProviderAuthServerMetadata(auth);

export const Route = createFileRoute("/.well-known/oauth-authorization-server/api/auth")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handler(request),
    },
  },
});
