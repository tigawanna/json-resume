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
  GITHUB_CLIENT_ID:z.string(),
  GITHUB_CLIENT_SECRET:z.string(),
  FRONTEND_URL: z.url(),
});

// Validate client environment
const { success, error, data } = envSchema.safeParse(process.env);

if (!success) {
  const formattedErrors = error.issues.map((e) => `- ${e.path.join(".")}: ${e.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${formattedErrors}`);
}

export const serverEnv = data;
