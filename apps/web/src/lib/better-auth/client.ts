import { apiKeyClient } from "@better-auth/api-key/client";
import { organizationRoles } from "@repo/isomorphic/auth-roles";
import { adminClient, multiSessionClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { clientEnv } from "../env/client-env";

// Auth now lives on `apps/api`. The web app no longer hosts Better Auth.
export const authClient = createAuthClient({
  baseURL: clientEnv.VITE_HONO_API_URL,
  plugins: [adminClient(), multiSessionClient(), apiKeyClient()],
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
