import { defineConfig } from "vite-plus";

export default defineConfig({
  build: {
    lib: {
      entry: ["src/auth-roles.ts", "src/typescript-helpers.ts"],
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
