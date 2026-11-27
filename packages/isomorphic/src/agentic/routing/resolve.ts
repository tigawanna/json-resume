import { AGENT_MAX_OUTPUT_TOKENS } from "./constants.ts";
import {
  availableOfficialSlugs,
  officialProviderSlugs,
  providerSlugFromTag,
  supportsTools,
} from "./providers.ts";
import type { AiRouting } from "./schema.ts";
import type { OpenRouterModelData, OpenRouterModelEndpoint } from "./types.ts";

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
  let providers: string[];
  if (routing.mode === "official" && endpoints) {
    providers = availableOfficialSlugs(modelId, endpoints);
  } else if (routing.mode === "official") {
    providers = [...officialProviderSlugs(modelId)];
  } else if (routing.mode === "custom") {
    providers = routing.providers;
  } else {
    providers = [];
  }

  const resolved: AiRouting = {
    mode: providers.length === 0 && routing.mode !== "auto" ? "auto" : routing.mode,
    providers,
    sort: routing.mode === "auto" ? routing.sort : undefined,
    allowFallbacks: routing.allowFallbacks,
  };

  const caps = routedEndpoints(resolved, endpoints ?? [])
    .map((endpoint) => endpoint.max_completion_tokens)
    .filter((cap): cap is number => typeof cap === "number" && cap > 0);
  let endpointCap = model?.top_provider.max_completion_tokens;
  if (caps.length > 0) {
    endpointCap = resolved.mode === "auto" ? Math.max(...caps) : Math.min(...caps);
  }

  return {
    ...resolved,
    maxOutputTokens: Math.min(AGENT_MAX_OUTPUT_TOKENS, endpointCap ?? AGENT_MAX_OUTPUT_TOKENS),
  };
}
