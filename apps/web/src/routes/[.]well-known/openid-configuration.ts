import { auth } from "@/lib/auth";
import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { createFileRoute } from "@tanstack/react-router";

const handler = oauthProviderOpenIdConfigMetadata(auth);

export const Route = createFileRoute("/.well-known/openid-configuration")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handler(request),
    },
  },
});
