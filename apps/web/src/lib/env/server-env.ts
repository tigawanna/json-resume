// src/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().refine(
    (val) => {
      try {
        // Accepts standard URLs or 'file:' scheme for sqlite paths
        const u = new URL(val, "file://");
        return !!u;
      } catch {
        return false;
      }
    },
    { message: "Invalid DATABASE_URL; must be a valid URL or file: URL" },
  ),
  DATABASE_AUTH_TOKEN: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_API_BASE_URL: z.url().optional(),
  FRONTEND_URL: z.url(),
  CRON_SECRET: z.string().optional(),
  /** Master switch for résumé credits. Off until enforcement ships. */
  CREDITS_ENABLED: z.enum(["true"]).optional(),
  /**
   * ISO timestamp before which résumé creation is grandfathered (free). Existing
   * résumés and legacy imports stay free on rebuilds too, via this cutoff.
   */
  CREDITS_START_AT: z.iso.datetime().optional(),
});

// Validate client environment
const { success, error, data } = envSchema.safeParse(process.env);

if (!success) {
  const formattedErrors = error.issues.map((e) => `- ${e.path.join(".")}: ${e.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${formattedErrors}`);
}

export const serverEnv = data;
