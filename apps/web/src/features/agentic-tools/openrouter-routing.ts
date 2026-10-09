import type { ProviderPreferences } from "@tanstack/ai-openrouter";
import { z } from "zod";
import type { OpenRouterModelData, OpenRouterModelEndpoint } from "@/types/openrouter";

/**
 * Output ceiling for one agent turn. Reasoning tokens count against it, and a
 * tailored résumé written through tool arguments can run past 10K tokens.
 */
export const AGENT_MAX_OUTPUT_TOKENS = 32_768;

/** Endpoints capped below this cannot fit a full résumé rewrite plus reasoning. */
export const LOW_OUTPUT_CAP_TOKENS = 16_384;

export const providerRoutingModes = ["auto", "official", "custom"] as const;
export const providerSorts = ["price", "throughput", "latency"] as const;

const providerSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9._-]*$/);

/**
 * How OpenRouter picks the upstream provider for the agent.
 * - `auto`: OpenRouter's router (keeps Auto Exacto tool-call routing), optionally sorted.
 * - `official`: the model lab's own API, e.g. DeepSeek for `deepseek/*`.
 * - `custom`: the providers the user ticked, tried in order.
 */
export const aiRoutingSchema = z.object({
  mode: z.enum(providerRoutingModes),
  providers: z.array(providerSlugSchema).max(16),
  sort: z.enum(providerSorts).optional(),
  allowFallbacks: z.boolean(),
  maxOutputTokens: z.number().int().positive().max(AGENT_MAX_OUTPUT_TOKENS).optional(),
});
export type AiRouting = z.infer<typeof aiRoutingSchema>;
export type ProviderRoutingMode = AiRouting["mode"];
export type ProviderSort = NonNullable<AiRouting["sort"]>;

export const DEFAULT_AI_ROUTING: AiRouting = {
  mode: "auto",
  providers: [],
  allowFallbacks: true,
};

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

/**
 * `requireParameters` keeps tool calls and `max_tokens` off endpoints that would
 * silently drop them. Auto mode leaves provider choice to OpenRouter so tool calls
 * keep Auto Exacto routing; official/custom pin the order the user picked.
 */
export function buildProviderPreferences(routing: AiRouting): ProviderPreferences {
  const pinned = routing.mode !== "auto" && routing.providers.length > 0;
  return {
    requireParameters: true,
    ...(pinned && { order: routing.providers, allowFallbacks: routing.allowFallbacks }),
    ...(routing.mode === "auto" && routing.sort && { sort: routing.sort }),
  };
}

function routedEndpoints(
  routing: AiRouting,
  endpoints: readonly OpenRouterModelEndpoint[],
): OpenRouterModelEndpoint[] {
  if (routing.mode === "auto") return endpoints.filter(supportsTools);
  const pinned = new Set(routing.providers);
  return endpoints.filter((endpoint) => pinned.has(providerSlugFromTag(endpoint.tag)));
}

/**
 * Fills in what the request needs from the live endpoint list: the official
 * slugs for `official` mode and an explicit output cap no pinned endpoint
 * would reject. Without endpoint data the cap falls back to the model's top provider.
 */
export function resolveRouting(
  modelId: string,
  routing: AiRouting,
  endpoints: readonly OpenRouterModelEndpoint[] | undefined,
  model: OpenRouterModelData | undefined,
): AiRouting {
  const providers =
    routing.mode === "official"
      ? endpoints
        ? availableOfficialSlugs(modelId, endpoints)
        : [...officialProviderSlugs(modelId)]
      : routing.mode === "custom"
        ? routing.providers
        : [];

  const resolved: AiRouting = {
    mode: providers.length === 0 && routing.mode !== "auto" ? "auto" : routing.mode,
    providers,
    sort: routing.mode === "auto" ? routing.sort : undefined,
    allowFallbacks: routing.allowFallbacks,
  };

  const caps = routedEndpoints(resolved, endpoints ?? [])
    .map((endpoint) => endpoint.max_completion_tokens)
    .filter((cap): cap is number => typeof cap === "number" && cap > 0);
  const endpointCap =
    caps.length === 0
      ? model?.top_provider.max_completion_tokens
      : resolved.mode === "auto"
        ? Math.max(...caps)
        : Math.min(...caps);

  return {
    ...resolved,
    maxOutputTokens: Math.min(AGENT_MAX_OUTPUT_TOKENS, endpointCap ?? AGENT_MAX_OUTPUT_TOKENS),
  };
}
