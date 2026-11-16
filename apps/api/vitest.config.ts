import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@api": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["tests/setup/db.ts"],
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
