import z from "zod";

const envSchema = z.object({
  VITE_API_URL: z.url().optional(),
  /** Public origin of `apps/api` (Hono). */
  VITE_HONO_API_URL: z.url().default("http://localhost:3100"),
  /** Public origin of `apps/nest` (OpenAPI/Kubb client). */
  VITE_NEST_API_URL: z.url().default("http://localhost:5040"),
  VITE_SENTRY_DSN: z.url().optional(),
  /** Master switch for résumé credits, mirrored client-side. */
  VITE_CREDITS_ENABLED: z.enum(["true"]).optional(),
  /** Desktop builds keep local, un-metered use. */
  VITE_DESKTOP: z.enum(["true"]).optional(),
});

// Each key must be a direct `import.meta.env.VITE_*` read. Vite only inlines
// those static accesses in the browser bundle. Passing `import.meta.env` itself
// drops the values.
const raw = {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_HONO_API_URL: import.meta.env.VITE_HONO_API_URL,
  VITE_NEST_API_URL: import.meta.env.VITE_NEST_API_URL,
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  VITE_CREDITS_ENABLED: import.meta.env.VITE_CREDITS_ENABLED,
  VITE_DESKTOP: import.meta.env.VITE_DESKTOP,
};

const { success, error, data } = envSchema.safeParse(raw);

if (!success) {
  const formattedErrors = error.issues.map((e) => `- ${e.path.join(".")}: ${e.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${formattedErrors}`);
}

export const clientEnv = data;

/** Public origin of this web app. Nest owns API secrets; this is only the UI URL. */
export const siteOrigin = data.VITE_API_URL ?? "http://localhost:3040";
