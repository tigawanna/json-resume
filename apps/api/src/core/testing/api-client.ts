import { app } from "@api/app";
import { testClient } from "hono/testing";

/** Typed RPC client for HTTP tests. Same path shape as the web `honoClient`. */
export const apiClient = testClient(app);

export function sessionInit({ cookie }: { cookie: string }) {
  return { headers: { Cookie: cookie } } as const;
}

/**
 * Better Auth is mounted with `.on("/auth/*")`, so it is not on `AppType`.
 * OIDC discovery sits outside `/api` for the same reason.
 */
export function authSignUpRequest({
  email,
  name,
  password = "password123",
}: {
  email: string;
  name: string;
  password?: string;
}) {
  return app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
}
