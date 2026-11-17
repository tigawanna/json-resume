import { RemovalPolicy, SecretValue } from "aws-cdk-lib";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";
import { apiSecretValues } from "./api-env.js";
import { isEmulator } from "./emulator.js";

/**
 * One JSON secret holding every `API_SECRET_KEYS` value. On an emulator it is
 * seeded from the deploying shell for convenience. On a real account only
 * `BETTER_AUTH_SECRET` is generated; set the rest with `put-secret-value` so no
 * credential lands in the template.
 */
export function createApiSecret({ scope }: { scope: Construct }): Secret {
  if (isEmulator) {
    const seeded = Object.entries(apiSecretValues()).map(
      ([key, value]) => [key, SecretValue.unsafePlainText(value)] as const,
    );
    return new Secret(scope, "ApiSecrets", {
      secretName: "resume-api/secrets",
      secretObjectValue: Object.fromEntries(seeded),
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  return new Secret(scope, "ApiSecrets", {
    secretName: "resume-api/secrets",
    removalPolicy: RemovalPolicy.RETAIN,
    generateSecretString: {
      secretStringTemplate: JSON.stringify({}),
      generateStringKey: "BETTER_AUTH_SECRET",
      passwordLength: 48,
      excludePunctuation: true,
    },
  });
}
