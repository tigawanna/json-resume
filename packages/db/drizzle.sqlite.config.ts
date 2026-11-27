import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:../../.local-db/json-resume.db";
const shared = {
  schema: "./src/sqlite/schema/**/*.ts",
  out: "./drizzle/sqlite/migrations",
};

/** The turso dialect demands an auth token, so local files go through the sqlite dialect. */
export default url.startsWith("file:")
  ? defineConfig({ ...shared, dialect: "sqlite", dbCredentials: { url } })
  : defineConfig({
      ...shared,
      dialect: "turso",
      dbCredentials: { url, authToken: process.env.DATABASE_AUTH_TOKEN ?? "" },
    });
