import type { AiRouting } from "./schema.ts";
import { officialProviderSlugs } from "./providers.ts";

/** Latest DeepSeek Flash snapshot on OpenRouter (17 Oct 2026). The September id stays on the old weights. */
export const DEFAULT_MODEL = "deepseek/deepseek-v4.1-flash-1017";

/** Official first-party route for the default model. The settings panel shows this until the user changes it. */
export const DEFAULT_AI_ROUTING: AiRouting = {
  mode: "official",
  providers: [...officialProviderSlugs(DEFAULT_MODEL)],
  allowFallbacks: true,
};
