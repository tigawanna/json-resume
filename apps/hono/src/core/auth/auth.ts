import { apiKey } from "@better-auth/api-key";
import { jwtPlugin } from "@hono-api/core/auth/jwt";
import { type AppDb } from "@hono-api/core/db/client";
import { env } from "@hono-api/env";
import * as authSchema from "@repo/db/schema/auth-schema";
import { organizationAc, organizationRoles } from "@repo/isomorphic/auth-roles";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { AccessControl } from "better-auth/plugins/access";
import { admin } from "better-auth/plugins/admin";
import { multiSession } from "better-auth/plugins/multi-session";
import { organization } from "better-auth/plugins/organization";

/**
 * Better Auth instance owned by the API. Mirrors the transitional instance in
 * `apps/web/src/lib/auth.ts` (same tables, same secret) minus the TanStack Start
 * cookie plugin, which only exists to forward Set-Cookie headers in Start.
 *
 * Desktop clients are not wired yet. When they are, add the `electron`/`bearer`
 * plugins here and register the desktop origin in `TRUSTED_ORIGINS`.
 */
export function createAuth({ db }: { db: AppDb }) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.TRUSTED_ORIGINS,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: authSchema,
    }),
    advanced: {
      database: {
        joins: true,
      },
      // The web app and this API are different origins (different ports in dev,
      // different hosts in prod). Lax cookies set on the API are not attached to
      // later fetches from the frontend, so a reload looks logged out.
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },
    plugins: [
      admin(),
      organization({
        ac: organizationAc as AccessControl,
        roles: organizationRoles,
      }),
      multiSession(),
      jwtPlugin(),
      apiKey({
        defaultPrefix: "ajr",
        rateLimit: {
          enabled: true,
          timeWindow: 60 * 1000,
          maxRequests: 120,
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Session with the user row, as returned by `auth.api.getSession`. */
export type AuthSession = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
