import { defineConfig } from "vite-plus";

export default defineConfig({
  build: {
    lib: {
      entry: [
        "src/auth-roles.ts",
        "src/typescript-helpers.ts",
        "src/resume/layout.ts",
        "src/resume/schema.ts",
        "src/library/keys.ts",
        "src/library/references.ts",
        "src/sync/reset.ts",
        "src/sync/projection-constraint.ts",
        "src/sync/compact-plan.ts",
        "src/sync/squash-plan.ts",
      ],
      formats: ["es"],
    },
    rolldownOptions: {
      external: [/^better-auth/],
    },
    minify: false,
    emptyOutDir: true,
    sourcemap: true,
  },
});
