import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["**/routeTree.gen.ts", "**/services/nest/generated/**"],
  },
  staged: {
    "*": (files: readonly string[]) => {
      const checked = files.filter((file) => !file.endsWith("routeTree.gen.ts"));
      if (checked.length === 0) return [];
      return `vp check --fix ${checked.map((file) => `'${file}'`).join(" ")}`;
    },
  },
  lint: {
    ignorePatterns: ["**/services/nest/generated/**"],
    options: { typeAware: true, typeCheck: true },
    jsPlugins: ["@shadcn/lint"],
    categories: { correctness: "error" },
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "no-nested-ternary": "warn",
    },
  },
});
