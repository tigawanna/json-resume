import { Annotations } from "aws-cdk-lib";
import { HttpMethod, type HttpApi, type HttpRouteIntegration } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import type { Construct } from "constructs";
import { isEmulator } from "./emulator.js";

/**
 * JWT check on `/api/sync/*` only. Everything else, including Better Auth at
 * `/api/auth/*`, keeps cookie auth through the default route. OPTIONS is left
 * on the default route so CORS preflight (which carries no token) still works.
 *
 * On a real account the issuer defaults to `BETTER_AUTH_URL` (this API origin).
 * Floci skips it unless `SYNC_JWT_ISSUER` is set, because the authorizer has to
 * fetch OpenID discovery from a reachable URL.
 */
export function addSyncJwtRoutes({
  scope,
  httpApi,
  integration,
}: {
  scope: Construct;
  httpApi: HttpApi;
  integration: HttpRouteIntegration;
}) {
  const issuer =
    process.env.SYNC_JWT_ISSUER ?? (isEmulator ? undefined : process.env.BETTER_AUTH_URL);
  if (!issuer) {
    Annotations.of(scope).addWarningV2(
      "resume:sync-jwt-off",
      "SYNC_JWT_ISSUER is unset: /api/sync/* is not JWT-checked at the gateway.",
    );
    return;
  }

  const authorizer = new HttpJwtAuthorizer("SyncJwt", issuer, {
    jwtAudience: [process.env.SYNC_JWT_AUDIENCE ?? issuer],
  });

  httpApi.addRoutes({
    path: "/api/sync/{proxy+}",
    methods: [HttpMethod.GET, HttpMethod.POST],
    integration,
    authorizer,
  });
}
