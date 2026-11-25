import { apiKey } from '@better-auth/api-key';
import { organizationAc, organizationRoles } from '@repo/isomorphic/auth-roles';
import * as authSchema from '@repo/db/schema/auth-schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { AccessControl } from 'better-auth/plugins/access';
import { admin } from 'better-auth/plugins/admin';
import { jwt } from 'better-auth/plugins/jwt';
import { multiSession } from 'better-auth/plugins/multi-session';
import { organization } from 'better-auth/plugins/organization';
import type { DrizzleDB } from '../../database/database.module.js';

type AuthEnv = {
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  githubClientId: string;
  githubClientSecret: string;
};

export function createAuth({ db, env }: { db: DrizzleDB; env: AuthEnv }) {
  return betterAuth({
    baseURL: env.baseURL,
    basePath: '/api/auth',
    secret: env.secret,
    trustedOrigins: env.trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: authSchema,
    }),
    advanced: {
      database: { joins: true },
      defaultCookieAttributes: {
        sameSite: 'none',
        secure: true,
      },
    },
    emailAndPassword: { enabled: true },
    socialProviders: {
      github: {
        clientId: env.githubClientId,
        clientSecret: env.githubClientSecret,
      },
    },
    plugins: [
      admin(),
      organization({
        ac: organizationAc as AccessControl,
        roles: organizationRoles,
      }),
      multiSession(),
      jwt({
        jwks: { keyPairConfig: { alg: 'ES256' } },
        jwt: {
          issuer: env.baseURL,
          audience: env.baseURL,
          expirationTime: '15m',
        },
      }),
      apiKey({
        defaultPrefix: 'ajr',
        rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 120 },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;


