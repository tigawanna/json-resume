import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/**/*.ts",
  out: "./drizzle/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./.local-db/json-resume-latest.db",
    authToken: process.env.DATABASE_AUTH_TOKEN ?? "",
  },
});
