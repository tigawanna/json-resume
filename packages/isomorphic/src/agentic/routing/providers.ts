import type { OpenRouterModelEndpoint } from "./types.ts";

/** Model author (the id prefix) → OpenRouter slugs of that lab's first-party API. */
const OFFICIAL_PROVIDER_SLUGS: Record<string, readonly string[]> = {
  openai: ["openai"],
  anthropic: ["anthropic"],
  google: ["google-ai-studio", "google-vertex"],
  deepseek: ["deepseek"],
  mistralai: ["mistral"],
  qwen: ["alibaba"],
  "x-ai": ["xai"],
  "z-ai": ["z-ai"],
  moonshotai: ["moonshotai"],
  minimax: ["minimax"],
  cohere: ["cohere"],
  amazon: ["amazon-bedrock"],
  "bytedance-seed": ["seed"],
  tencent: ["tencent"],
  stepfun: ["stepfun"],
  xiaomi: ["xiaomi"],
  perplexity: ["perplexity"],
  inception: ["inception"],
};

export function modelAuthor(modelId: string): string {
  return (modelId.split("/")[0] ?? "").replace(/^~/, "");
}

/** `deepinfra/fp8` → `deepinfra`. `order`/`only` take the bare provider slug. */
export function providerSlugFromTag(tag: string): string {
  return tag.split("/")[0] ?? tag;
}

export function officialProviderSlugs(modelId: string): readonly string[] {
  const author = modelAuthor(modelId);
  return OFFICIAL_PROVIDER_SLUGS[author] ?? [author];
}

export function isOfficialEndpoint(modelId: string, endpoint: OpenRouterModelEndpoint): boolean {
  return officialProviderSlugs(modelId).includes(providerSlugFromTag(endpoint.tag));
}

export function supportsTools(endpoint: { supported_parameters?: string[] }): boolean {
  return endpoint.supported_parameters?.includes("tools") ?? false;
}

/** Official slugs that actually serve this model, in preference order. */
export function availableOfficialSlugs(
  modelId: string,
  endpoints: readonly OpenRouterModelEndpoint[],
): string[] {
  const served = new Set(endpoints.map((endpoint) => providerSlugFromTag(endpoint.tag)));
  return officialProviderSlugs(modelId).filter((slug) => served.has(slug));
}
