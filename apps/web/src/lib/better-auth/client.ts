import { apiKeyClient } from "@better-auth/api-key/client";
import { organizationRoles } from "@repo/isomorphic/auth-roles";
import { adminClient, jwtClient, multiSessionClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { clientEnv } from "../env/client-env";

// Better Auth lives on apps/nest. The client baseURL is the origin; it appends
// /api/auth itself, unlike the generated OpenAPI client which uses /api.
export const authClient = createAuthClient({
  baseURL: clientEnv.VITE_NEST_API_URL,
  plugins: [adminClient(), multiSessionClient(), apiKeyClient(), jwtClient()],
});

export type BetterAuthSession = typeof authClient.$Infer.Session;
export type BetterAuthUserRoles = keyof typeof organizationRoles;

export const userRoles = Object.keys(organizationRoles);

/**
 * Better Auth resolves a relative callbackURL against its baseURL, which is the
 * API origin. Absolute URLs stay on the frontend after OAuth.
 */
export function frontendCallbackUrl({ callbackURL }: { callbackURL: string }) {
  if (/^https?:\/\//i.test(callbackURL)) return callbackURL;
  return new URL(callbackURL, window.location.origin).toString();
}
