import { defineConfig } from "vite-plus";

export default defineConfig({
  build: {
    lib: {
      entry: ["src/button.tsx", "src/card.tsx", "src/code.tsx"],
      formats: ["es"],
    },
    rolldownOptions: {
      external: [/^react/, /^react-dom/],
      onLog(level, log, defaultHandler) {
        if (log.code === "MODULE_LEVEL_DIRECTIVE") return;
        defaultHandler(level, log);
      },
    },
    minify: false,
    emptyOutDir: true,
    sourcemap: true,
  },
});
