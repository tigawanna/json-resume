import path from "node:path";
import { config } from "dotenv";
import { z } from "zod";

/**
 * Loads env files before validation. Production hosts inject env vars directly.
 * In dev the API falls back to `apps/web/.env` so one file drives the whole
 * workspace until the secrets move to the API deployment.
 */
function loadEnvFiles() {
  const files = [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "../web/.env")];
  for (const file of files) {
    config({ path: file, override: false, quiet: true });
  }
}

if (process.env.NODE_ENV !== "production") {
  loadEnvFiles();
}

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(3100),
    /** Turso / libsql URL (`libsql://…` or `file:…`). Same database as `apps/web`. */
    DATABASE_URL: z.string().min(1),
    DATABASE_AUTH_TOKEN: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().min(1),
    /** Public origin of this API. OAuth callbacks are built from it. */
    BETTER_AUTH_URL: z.url().default("http://localhost:3100"),
    /** Public origin of the web app (first-party CORS origin). */
    FRONTEND_URL: z.url().default("http://localhost:3040"),
    BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    CRON_SECRET: z.string().optional(),
    /** Master switch for résumé credits. Enforcement is off until this is "true". */
    CREDITS_ENABLED: z.enum(["true"]).optional(),
    /** ISO instant: résumés created before it are grandfathered (free), even on rebuild. */
    CREDITS_START_AT: z.iso.datetime().optional(),
    /** Directory for the dev NDJSON wide-event drain. */
    EVLOG_DIR: z.string().default(".evlog/logs"),
  })
  .transform((env) => ({
    ...env,
    DATABASE_AUTH_TOKEN: env.DATABASE_AUTH_TOKEN?.trim() || undefined,
    TRUSTED_ORIGINS: [
      ...new Set(
        [env.FRONTEND_URL, env.BETTER_AUTH_URL, ...splitOrigins(env.BETTER_AUTH_TRUSTED_ORIGINS)]
          .map((origin) => origin?.trim())
          .filter((origin): origin is string => Boolean(origin)),
      ),
    ],
  }));

function splitOrigins(value: string | undefined) {
  if (!value) return [];
  return value.split(",");
}

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid apps/api environment:\n${issues}`);
}

export const env = parsed.data;
