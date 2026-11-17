/**
 * Keys `apps/api/src/env.ts` reads, split by sensitivity. Config goes on the
 * Lambda as plain env vars. Secrets live in Secrets Manager and are loaded into
 * `process.env` before the app is imported.
 */
const API_CONFIG_KEYS = [
  "BETTER_AUTH_URL",
  "FRONTEND_URL",
  "BETTER_AUTH_TRUSTED_ORIGINS",
  "CREDITS_ENABLED",
  "CREDITS_START_AT",
] as const;

export const API_SECRET_KEYS = [
  "DATABASE_URL",
  "DATABASE_AUTH_TOKEN",
  "BETTER_AUTH_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "CRON_SECRET",
] as const;

/** Values set in the deploying shell. Unset keys are left out so the API's validation reports them. */
function presentValues({ keys }: { keys: readonly string[] }): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = process.env[key];
    if (value) values[key] = value;
  }
  return values;
}

export function apiConfigEnvironment(): Record<string, string> {
  return { NODE_ENV: "production", ...presentValues({ keys: API_CONFIG_KEYS }) };
}

export function apiSecretValues(): Record<string, string> {
  return presentValues({ keys: API_SECRET_KEYS });
}
