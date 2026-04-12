import { organizationAc, organizationRoles } from "@repo/isomorphic/auth-roles";
import { adminClient, multiSessionClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { clientEnv } from "../client-env";

export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: clientEnv.VITE_API_URL,
  plugins: [
    adminClient({
      ac: organizationAc as any,
      roles: organizationRoles,
    }),
    organizationClient(),
    multiSessionClient(),
  ],
});

export type BetterAuthSession = typeof authClient.$Infer.Session;
export type BetterAuthUserRoles = keyof typeof organizationRoles;
export type BetterAuthOrgRoles = "owner" | "staff" | "member" | ("owner" | "staff" | "member")[];

export const userRoles = Object.keys(organizationRoles);
