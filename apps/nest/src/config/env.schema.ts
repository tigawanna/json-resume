import { z } from "zod";

const POSTGRES_URL = /^postgres(?:ql)?:\/\//;

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
  POSTGRES_URL: "postgresql://postgres:postgres@127.0.0.1:5432/agentic_json_resume_nest_test",
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
  GITHUB_CLIENT_ID: "test-github-id",
  GITHUB_CLIENT_SECRET: "test-github-secret",
};

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(defaultPort),
    SERVER_URL: z.url().default(`http://localhost:${defaultPort}`),
    POSTGRES_URL: z.string().min(1),
    POSTGRES_POOL_MAX: z.coerce.number().int().min(1).max(20).default(2),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url().default(`http://localhost:${defaultPort}`),
    FRONTEND_URL: z.url().default(`http://localhost:${defaultFrontendPort}`),
    BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    GITHUB_API_BASE_URL: z.url().default("https://api.github.com"),
    ADMIN_BYPASS_SECRET: optionalSecret(),
    CREDITS_ENABLED: z.enum(["true"]).optional(),
    CREDITS_START_AT: z.iso.datetime().optional(),
    OBSERVE_APP_KEY: optionalSecret(),
    OBSERVE_APP_SECRET: optionalSecret(),
  })
  .refine((env) => env.NODE_ENV === "test" || POSTGRES_URL.test(env.POSTGRES_URL), {
    path: ["POSTGRES_URL"],
    message: "use a postgres:// or postgresql:// URL",
  })
  .refine((env) => env.NODE_ENV !== "production" || !env.ADMIN_BYPASS_SECRET, {
    path: ["ADMIN_BYPASS_SECRET"],
    message: "must not be set in production",
  })
  .transform((env) => ({
    ...env,
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
