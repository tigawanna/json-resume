import { defineConfig } from "vite-plus";

export default defineConfig({
  build: {
    lib: {
      entry: [
        "src/generated/.kubb/client.ts",
        "src/generated/models/index.ts",
        "src/generated/clients/admin/index.ts",
        "src/generated/clients/auth/index.ts",
        "src/generated/clients/credits/index.ts",
        "src/generated/clients/sync/index.ts",
        "src/generated/clients/waitlist/index.ts",
        "src/sync/compaction.ts",
      ],
      formats: ["es"],
    },
    minify: false,
    emptyOutDir: true,
    sourcemap: true,
  },
});
