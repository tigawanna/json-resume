import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.url(),
});


const { success, error, data } = envSchema.safeParse(import.meta.env);

if (!success) {
  const formattedErrors = error.issues.map((e) => `- ${e.path.join(".")}: ${e.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${formattedErrors}`);
}

export const clientEnv = data;
