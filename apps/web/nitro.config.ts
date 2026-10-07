import { defineConfig } from "nitro";
import evlog from "evlog/nitro/v3";

export default defineConfig({
  experimental: {
    asyncContext: true,
  },
  // `serverDir` is off, so `server/plugins` is not scanned; plugins are listed here.
  plugins: ["./server/plugins/evlog-drain.ts"],
  modules: [
    evlog({
      env: { service: "agentic-json-resume" },
    }),
  ],
});
