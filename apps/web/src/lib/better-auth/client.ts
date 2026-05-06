import { apiKeyClient } from "@better-auth/api-key/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { organizationRoles } from "@repo/isomorphic/auth-roles";
import { adminClient, multiSessionClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { clientEnv } from "../client-env";

export const authClient = createAuthClient({
  baseURL: clientEnv.VITE_API_URL,
  plugins: [adminClient(), multiSessionClient(), apiKeyClient(), oauthProviderClient()],
});

export type BetterAuthSession = typeof authClient.$Infer.Session;
export type BetterAuthUserRoles = keyof typeof organizationRoles;

export const userRoles = Object.keys(organizationRoles);
