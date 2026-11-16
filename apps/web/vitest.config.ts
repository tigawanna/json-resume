import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@api": fileURLToPath(new URL("../api/src", import.meta.url)),
    },
  },
  test: {
    // jsdom boots a DOM per file. Almost every test is Node; the few that render opt in.
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/playwright-report/**"],
    globals: false,
    restoreMocks: true,
  },
});
