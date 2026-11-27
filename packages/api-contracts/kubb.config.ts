import { pluginFetch } from "@kubb/plugin-fetch";
import { pluginTs } from "@kubb/plugin-ts";
import { defineConfig } from "kubb/config";

// Better Auth routes stay out of Kubb on purpose: `authClient` in
// `lib/better-auth/client.ts` is already generated and typed by Better Auth.
// The Better Auth organization schema also documents a deprecated singular
// `permission` field that is still accepted, so Kubb's deprecation notice is
// expected third-party noise rather than an action item.
const include = ["meta", "auth", "github", "public-resumes", "credits", "waitlist", "admin", "sync"].map((tag) => ({
  type: "tag" as const,
  pattern: `^${tag}$`,
}));

export default defineConfig({
  name: "nest-api",
  input: process.env.NEST_OPENAPI_URL ?? "http://localhost:5040/api/docs-json",
  output: {
    path: "./src/generated",
    clean: true,
    format: "oxfmt",
  },
  diagnostics: { ignore: ["KUBB_DEPRECATED"] },
  plugins: [
    pluginTs({
      output: { path: "models", barrel: { type: "named" } },
      include,
    }),
    pluginFetch({
      output: { path: "clients", barrel: { type: "named" } },
      group: { type: "tag" },
      include,
      returnType: "data",
    }),
  ],
});
