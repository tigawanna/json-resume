// import { z } from "zod";

// const envSchema = z.object({
//   VITE_API_URL: z.url(),
// });

const raw = {
  VITE_API_URL: import.meta?.env?.VITE_API_URL ?? process.env?.VITE_API_URL,
};

console.log("raw === ", raw);
// const { success, error, data } = envSchema.safeParse(raw);

// if (!success) {
//   const formattedErrors = error.issues.map((e) => `- ${e.path.join(".")}: ${e.message}`).join("\n");
//   throw new Error(`Invalid environment variables:\n${formattedErrors}`);
// }

export const clientEnv =
  import.meta?.env?.VITE_API_URL ?? "https://agentic-json-resume-web.vercel.app/";
