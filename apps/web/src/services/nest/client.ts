import { clientEnv } from "@/lib/env/client-env";
import { createIsomorphicFn } from "@tanstack/react-start";
import { client } from "./generated/.kubb/client";

client.setConfig({
  // OpenAPI paths omit Nest's global prefix, while VITE_NEST_API_URL stays an
  // origin because the Better Auth client appends /api/auth itself.
  baseURL: `${clientEnv.VITE_NEST_API_URL}/api`,
  credentials: "include",
});

// Browser fetch sends the Better Auth cookie through credentials. SSR fetch has
// no cookie jar, so forward the incoming request's cookie to Nest explicitly.
client.interceptors.request.use(async (request) => {
  const cookie = await serverRequestCookie();
  if (cookie) request.headers.Cookie = cookie;
  return request;
});

export * from "./generated/clients/admin";
export * from "./generated/clients/auth";
export * from "./generated/clients/credits";
export * from "./generated/clients/sync";
export * from "./generated/clients/waitlist";

const serverRequestCookie = createIsomorphicFn()
  .server(async () => {
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    try {
      return getRequestHeaders().get("cookie") ?? undefined;
    } catch {
      return undefined;
    }
  })
  .client(() => undefined);
