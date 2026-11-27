import { z } from "zod";

const REMOTE_DATABASE_URL = /^(libsql|https?|wss?):\/\/|^file:/;

function optionalSecret() {
  return z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined);
}

const defaultPort = 5040;
const defaultFrontendPort = 3040;

const testDefaults = {
  DATABASE_URL: "http://127.0.0.1:8080",
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
  GITHUB_CLIENT_ID: "test-github-id",
  GITHUB_CLIENT_SECRET: "test-github-secret",
};

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(defaultPort),
    SERVER_URL: z.url().default(`http://localhost:${defaultPort}`),
    DATABASE_URL: z.string().min(1),
    DATABASE_AUTH_TOKEN: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url().default(`http://localhost:${defaultPort}`),
    FRONTEND_URL: z.url().default(`http://localhost:${defaultFrontendPort}`),
    BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    ADMIN_BYPASS_SECRET: optionalSecret(),
    CREDITS_ENABLED: z.enum(["true"]).optional(),
    CREDITS_START_AT: z.iso.datetime().optional(),
    OBSERVE_APP_KEY: optionalSecret(),
    OBSERVE_APP_SECRET: optionalSecret(),
  })
  .refine((env) => env.NODE_ENV === "test" || REMOTE_DATABASE_URL.test(env.DATABASE_URL), {
    path: ["DATABASE_URL"],
    message: "use a libsql://, https://, http:// or file: URL",
  })
  .refine((env) => env.NODE_ENV !== "production" || !env.ADMIN_BYPASS_SECRET, {
    path: ["ADMIN_BYPASS_SECRET"],
    message: "must not be set in production",
  })
  .transform((env) => ({
    ...env,
    DATABASE_AUTH_TOKEN: env.DATABASE_AUTH_TOKEN?.trim() || undefined,
    TRUSTED_ORIGINS: uniqueOrigins({
      origins: [
        env.FRONTEND_URL,
        env.BETTER_AUTH_URL,
        ...splitOrigins({ value: env.BETTER_AUTH_TRUSTED_ORIGINS }),
      ],
    }),
  }));

export type AppEnv = z.output<typeof EnvSchema>;

export function validateEnv({ source }: { source: Record<string, unknown> }): AppEnv {
  const expanded = expandEnvReferences({ source });
  const nodeEnv = expanded.NODE_ENV;
  const withDefaults = nodeEnv === "test" ? { ...testDefaults, ...expanded } : expanded;
  const parsed = EnvSchema.safeParse(withDefaults);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid apps/nest environment:\n${issues}`);
  }
  return parsed.data;
}

/** Node `--env-file` does not expand `${NAME}`; ConfigModule then keeps those literals. */
function expandEnvReferences({ source }: { source: Record<string, unknown> }) {
  const expanded = { ...source };
  for (const [key, value] of Object.entries(expanded)) {
    if (typeof value !== "string") continue;
    expanded[key] = value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name: string) => {
      const resolved = expanded[name];
      return typeof resolved === "string" ? resolved : match;
    });
  }
  return expanded;
}

function splitOrigins({ value }: { value: string | undefined }) {
  if (!value) return [];
  return value.split(",");
}

function uniqueOrigins({ origins }: { origins: Array<string | undefined> }) {
  return [
    ...new Set(
      origins.map((origin) => origin?.trim()).filter((origin): origin is string => Boolean(origin)),
    ),
  ];
}
