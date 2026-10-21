import z from "zod";

const envSchema = z.object({
  VITE_API_URL: z.url().optional(),
  VITE_SENTRY_DSN: z.url(),
});

// Each key must be a direct `import.meta.env.VITE_*` read. Vite only inlines
// those static accesses in the browser bundle. Passing `import.meta.env` itself
// drops the values.
const raw = {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
};

const { success, error, data } = envSchema.safeParse(raw);

if (!success) {
  const formattedErrors = error.issues.map((e) => `- ${e.path.join(".")}: ${e.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${formattedErrors}`);
}

export const clientEnv = data;
