import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";
import { nitro } from "nitro/vite";

import tailwindcss from "@tailwindcss/vite";

const PRERENDER_PATHS = new Set([
  "/",
  "/search",
  "/privacy",
  "/privacy/",
  "/terms",
  "/terms/",
  "/auth",
  "/auth/",
  "/auth/github",
  "/auth/signup",
]);

const config = defineConfig({
  staged: { "*": "vp check --fix" },
  server: {
    host: "::",
    hmr: {
      // A transient dev-server error (e.g. a socket reset under load) puts the overlay
      // on every open page and blocks all pointer events until the test times out.
      overlay: process.env.VITE_E2E !== "true",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@api": fileURLToPath(new URL("../api/src", import.meta.url)),
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
      prerender: {
        enabled: true,
        // Crawl public links, then keep only pages that render without a session.
        // Dashboard, admin, and dev routes live on a pathless layout, so a
        // `/dashboard` prefix check never matches them. Query variants such as
        // `/auth?returnTo=` are the same screen crawled from links.
        crawlLinks: true,
        filter: (page) => PRERENDER_PATHS.has(page.path),
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
