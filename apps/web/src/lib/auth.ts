import { apiKey } from "@better-auth/api-key";
import { oauthProvider } from "@better-auth/oauth-provider";
import { organizationAc, organizationRoles } from "@repo/isomorphic/auth-roles";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { AccessControl } from "better-auth/plugins/access";
import { admin } from "better-auth/plugins/admin";
import { jwt } from "better-auth/plugins";
import { multiSession } from "better-auth/plugins/multi-session";
import { organization } from "better-auth/plugins/organization";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "./drizzle/client";
import * as authSchema from "./drizzle/scheam/auth-schema";
import { serverEnv } from "./server-env";

export const auth = betterAuth({
  baseURL: serverEnv.FRONTEND_URL,
  secret: serverEnv.BETTER_AUTH_SECRET,
  trustedOrigins: [serverEnv.FRONTEND_URL],
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: authSchema,
  }),
  experimental: {
    joins: true,
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: serverEnv.GITHUB_CLIENT_ID,
      clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
    },
  },
  plugins: [
    admin(),
    organization({
      ac: organizationAc as AccessControl,
      roles: organizationRoles,
    }),
    multiSession(),
    tanstackStartCookies(),
    jwt(),
    oauthProvider({
      loginPage: "/auth",
      consentPage: "/oauth/consent",
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      allowPublicClientPrelogin: true,
      validAudiences: [serverEnv.FRONTEND_URL],
      scopes: ["openid", "profile", "email", "offline_access", "resume:read", "resume:write"],
      clientRegistrationDefaultScopes: ["openid", "profile", "email", "offline_access"],
      clientRegistrationAllowedScopes: ["resume:read", "resume:write"],
      silenceWarnings: {
        oauthAuthServerConfig: true,
        openidConfig: true,
      },
    }),
    apiKey({
      defaultPrefix: "ajr",
    }),
  ],
});
