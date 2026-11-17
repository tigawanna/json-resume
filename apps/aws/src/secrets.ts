import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

/**
 * Copy the JSON secret at `API_SECRET_ARN` into `process.env`. Keys already set
 * win, so a local run can still pass values directly.
 */
export async function loadSecretsIntoEnv(): Promise<void> {
  const secretId = process.env.API_SECRET_ARN;
  if (!secretId) return;

  const { SecretString } = await new SecretsManagerClient({}).send(
    new GetSecretValueCommand({ SecretId: secretId }),
  );
  const parsed: unknown = JSON.parse(SecretString ?? "{}");
  if (parsed === null || typeof parsed !== "object") return;

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string" && !process.env[key]) process.env[key] = value;
  }
}
