import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";
import { nitro } from "nitro/vite";

import tailwindcss from "@tailwindcss/vite";

const config = defineConfig({
  staged: { "*": "vp check --fix" },
  server: {
    host: "::",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    tsconfigPaths: true,
  },
  build: {
    rolldownOptions: {
      // "use client" in deps (e.g. @base-ui) only matters for RSC, which this app doesn't use.
      onLog(level, log, defaultHandler) {
        if (log.code === "MODULE_LEVEL_DIRECTIVE") return;
        defaultHandler(level, log);
      },
    },
  },
  // Router 1.170 depends on @tanstack/react-store 0.11, which named-imports
  // a CJS shim. Prebundle it so the browser doesn't evaluate that shim raw.
  optimizeDeps: {
    include: [
      "@tanstack/react-router > @tanstack/react-store",
      "@tanstack/react-router > @tanstack/react-store > use-sync-external-store/shim/with-selector",
    ],
  },
  plugins: [
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    tailwindcss(),
    tanstackStart({
      router: {
        routeToken: "layout", // <-- Add this line
      },
    }),
    viteReact({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
});

export default config;
