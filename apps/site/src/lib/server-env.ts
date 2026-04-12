// src/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_AUTH_TOKEN: z.string(),
  BETTER_AUTH_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  API_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
});




// Validate client environment
const { success, error, data } = envSchema.safeParse(process.env);

if (!success) {
  const formattedErrors = error.issues.map((e) => `- ${e.path.join(".")}: ${e.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${formattedErrors}`);
}

export const serverEnv = data;

