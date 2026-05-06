import { defineMiddleware } from "nitro";
import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { auth } from "@/lib/auth";
import { serverEnv } from "@/lib/server-env";

type WellKnownHandler = (req: Request) => Promise<Response>;

async function protectedResourceMetadata(): Promise<Response> {
  return new Response(
    JSON.stringify({
      resource: serverEnv.FRONTEND_URL,
      authorization_servers: [`${serverEnv.FRONTEND_URL}/api/auth`],
      scopes_supported: ["resume:read", "resume:write"],
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
      },
    },
  );
}

const wellKnownHandlers: Record<string, WellKnownHandler> = {
  "/.well-known/oauth-authorization-server": oauthProviderAuthServerMetadata(auth),
  "/.well-known/oauth-authorization-server/api/auth": oauthProviderAuthServerMetadata(auth),
  "/.well-known/oauth-protected-resource": protectedResourceMetadata,
};

export default defineMiddleware(async (event) => {
  const { pathname } = new URL(event.req.url);
  const handler = wellKnownHandlers[pathname];
  if (!handler) return;
  return handler(event.req as unknown as Request);
});
