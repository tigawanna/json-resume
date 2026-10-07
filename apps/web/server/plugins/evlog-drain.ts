import { definePlugin } from "nitro";
import { createFsDrain } from "evlog/fs";

/** Writes every wide event to `.evlog/logs/<date>.jsonl` (relative to the server's cwd). */
export default definePlugin((nitroApp) => {
  // Vercel functions have a read-only filesystem.
  if (process.env.VERCEL) return;
  nitroApp.hooks.hook("evlog:drain", createFsDrain({ maxFiles: 14 }));
});
