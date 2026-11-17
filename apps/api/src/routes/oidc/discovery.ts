import { Hono } from "hono";
import { env } from "@api/env";

/**
 * API Gateway's JWT authorizer loads `{issuer}/.well-known/openid-configuration`.
 * Better Auth's jwt plugin serves JWKS at `/api/auth/jwks` but not this document.
 */
export const oidcDiscoveryRoute = new Hono().get("/.well-known/openid-configuration", (c) => {
  const issuer = env.BETTER_AUTH_URL;
  return c.json({
    issuer,
    jwks_uri: `${issuer}/api/auth/jwks`,
    authorization_endpoint: `${issuer}/api/auth/authorize`,
    token_endpoint: `${issuer}/api/auth/token`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["ES256"],
  });
});
