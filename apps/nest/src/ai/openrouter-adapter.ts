import {
  createOpenRouterText,
  type OpenRouterConfig,
  type OpenRouterTextModelOptions,
  type ProviderPreferences,
} from "@tanstack/ai-openrouter";
import type { AnyTextAdapter } from "@tanstack/ai";
import type { AiRouting } from "@repo/isomorphic/agentic/routing";

const RETRY_STATUS_CODES = ["408", "429", "5XX"];
const RETRY_CONFIG = {
  strategy: "backoff",
  backoff: { initialInterval: 2_000, maxInterval: 30_000, exponent: 1.5, maxElapsedTime: 75_000 },
  retryConnectionErrors: true,
} satisfies OpenRouterConfig["retryConfig"];

export function buildProviderPreferences(routing: AiRouting): ProviderPreferences {
  const pinned = routing.mode !== "auto" && routing.providers.length > 0;
  return {
    requireParameters: true,
    ...(pinned && { order: routing.providers, allowFallbacks: routing.allowFallbacks }),
    ...(routing.mode === "auto" && routing.sort && { sort: routing.sort }),
  };
}

export function buildOpenRouterModelOptions({
  routing,
  threadId,
  userId,
}: {
  routing: AiRouting;
  threadId: string;
  userId: string;
}): OpenRouterTextModelOptions {
  return {
    provider: buildProviderPreferences(routing),
    ...(routing.maxOutputTokens && { maxCompletionTokens: routing.maxOutputTokens }),
    sessionId: threadId.slice(0, 128),
    user: userId,
  };
}

export function buildTextAdapter({
  apiKey,
  model,
  frontendOrigin,
}: {
  apiKey: string | undefined;
  model: string | undefined;
  frontendOrigin: string;
}): AnyTextAdapter {
  if (!apiKey || !model) throw new Error("apiKey and model are required");
  // OpenRouter's live catalog is wider than the adapter's bundled model union.
  const openRouterModel = model as Parameters<typeof createOpenRouterText>[0];
  return createOpenRouterText(openRouterModel, apiKey, {
    httpReferer: frontendOrigin,
    retryCodes: RETRY_STATUS_CODES,
    retryConfig: RETRY_CONFIG,
  });
}
