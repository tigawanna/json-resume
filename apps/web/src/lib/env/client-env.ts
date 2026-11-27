import z from "zod";

const originSchema = z.url().transform((value) => value.replace(/\/+$/, ""));

const envSchema = z.object({
  VITE_API_URL: z.url().optional(),
  /** Canonical public origin for Nest product and auth routes. */
  VITE_API_ORIGIN: originSchema.optional(),
  /** Temporary alias for VITE_API_ORIGIN. Remove after deploy configs migrate. */
  VITE_NEST_API_URL: originSchema.optional(),
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
  VITE_API_ORIGIN: import.meta.env.VITE_API_ORIGIN,
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

/** One API origin for product routes and Better Auth. */
export const apiOrigin = data.VITE_API_ORIGIN ?? data.VITE_NEST_API_URL ?? "http://localhost:5040";

/** Public origin of this web app. Nest owns API secrets; this is only the UI URL. */
export const siteOrigin = data.VITE_API_URL ?? "http://localhost:3040";
