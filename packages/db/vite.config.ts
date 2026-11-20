import { defineConfig } from "vite-plus";

export default defineConfig({
  build: {
    lib: {
      entry: ["src/schema/auth-schema.ts"],
      formats: ["es"],
    },
    rolldownOptions: {
      external: [/^drizzle-orm/, "drizzle-zod", "zod"],
    },
    minify: false,
    emptyOutDir: true,
    sourcemap: true,
  },
});
