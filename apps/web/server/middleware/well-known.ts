import { defineMiddleware } from "nitro";
import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata } from "better-auth/plugins";
import { auth } from "@/lib/auth";

type WellKnownHandler = (req: Request) => Promise<Response>;

const wellKnownHandlers: Record<string, WellKnownHandler> = {
  "/.well-known/oauth-authorization-server": oAuthDiscoveryMetadata(auth),
  "/.well-known/oauth-protected-resource": oAuthProtectedResourceMetadata(auth),
};

export default defineMiddleware(async (event) => {
  const { pathname } = new URL(event.req.url);
  const handler = wellKnownHandlers[pathname];
  if (!handler) return;
  return handler(event.req as unknown as Request);
});
