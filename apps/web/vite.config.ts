import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";
import { nitro } from "nitro/vite";

import tailwindcss from "@tailwindcss/vite";

const config = defineConfig({
  server: {
    host: "::",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    tsconfigPaths: true,
  },
  plugins: [
    devtools(),
    nitro({
      preset: process.env.NITRO_PRESET ?? (process.env.VERCEL ? "vercel" : "node-server"),
    }),
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
