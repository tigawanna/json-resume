import { defineConfig } from "drizzle-kit";

const url = process.env.POSTGRES_URL;

if (!url) {
  throw new Error("POSTGRES_URL is required for the Postgres migration track");
}

export default defineConfig({
  schema: "./src/postgres/schema/**/*.ts",
  out: "./drizzle/postgres/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
