import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Auth tables live in `@repo/db` so `apps/api` can share them. Everything else
  // still lives in this app and moves to the package as its routes migrate.
  schema: ["./src/lib/drizzle/scheam/**/*.ts", "../../packages/db/src/schema/*.ts"],
  out: "./drizzle/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./db.sqlite",
    authToken: process.env.DATABASE_AUTH_TOKEN ?? "",
  },
});
