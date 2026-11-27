import { apiOrigin } from "@/lib/env/client-env";
import { createIsomorphicFn } from "@tanstack/react-start";
import { client } from "@repo/api-contracts/client";

client.setConfig({
  // OpenAPI paths omit Nest's global prefix. Better Auth uses the same origin
  // and appends /api/auth itself.
  baseURL: `${apiOrigin}/api`,
  credentials: "include",
});

// Browser fetch sends the Better Auth cookie through credentials. SSR fetch has
// no cookie jar, so forward the incoming request's cookie to Nest explicitly.
client.interceptors.request.use(async (request) => {
  const cookie = await serverRequestCookie();
  if (cookie) request.headers.Cookie = cookie;
  return request;
});

export * from "@repo/api-contracts/clients/admin";
export * from "@repo/api-contracts/clients/auth";
export * from "@repo/api-contracts/clients/credits";
export * from "@repo/api-contracts/clients/github";
export * from "@repo/api-contracts/clients/public-resumes";
export * from "@repo/api-contracts/clients/sync";
export * from "@repo/api-contracts/clients/waitlist";

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
