import { serverEnv } from "@/lib/server-env";
import { createFileRoute } from "@tanstack/react-router";

async function handler(): Promise<Response> {
  const metadata = {
    resource: serverEnv.FRONTEND_URL,
    authorization_servers: [`${serverEnv.FRONTEND_URL}/api/auth`],
    scopes_supported: ["resume:read", "resume:write"],
  };

  return new Response(JSON.stringify(metadata), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
    },
  });
}

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: handler,
    },
  },
});
