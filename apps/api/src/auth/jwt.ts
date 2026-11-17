import { jwt } from "better-auth/plugins/jwt";
import { env } from "@api/env";

/**
 * Access tokens for `/api/sync/*`. ES256 is what API Gateway's HTTP JWT
 * authorizer verifies; Better Auth's default EdDSA is not. Issuer and audience
 * are this API's public origin so discovery at `/.well-known/openid-configuration`
 * matches the token claims.
 */
export function jwtPlugin() {
  return jwt({
    jwks: { keyPairConfig: { alg: "ES256" } },
    jwt: {
      issuer: env.BETTER_AUTH_URL,
      audience: env.BETTER_AUTH_URL,
      expirationTime: "15m",
    },
  });
}
