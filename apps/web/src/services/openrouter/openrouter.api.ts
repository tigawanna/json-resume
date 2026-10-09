import type {
  OpenRouterCredits,
  OpenRouterCreditsResponse,
  OpenRouterModelData,
  OpenRouterModelEndpoint,
  OpenRouterModelEndpointsResponse,
  OpenRouterModelsResponse,
} from "@/types/openrouter";

const BASE_URL = "https://openrouter.ai/api/v1";

export async function fetchOpenRouterModels(): Promise<OpenRouterModelData[]> {
  const res = await fetch(`${BASE_URL}/models`);
  if (!res.ok) throw new Error(`Failed to fetch OpenRouter models: ${res.status}`);
  const json = (await res.json()) as OpenRouterModelsResponse;
  return json.data;
}

export async function fetchOpenRouterModelEndpoints(
  modelId: string,
): Promise<OpenRouterModelEndpoint[]> {
  const path = modelId.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${BASE_URL}/models/${path}/endpoints`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Failed to fetch providers for ${modelId}: ${res.status}`);
  const json = (await res.json()) as OpenRouterModelEndpointsResponse;
  return json.data.endpoints;
}

export async function fetchOpenRouterCredits(apiKey: string): Promise<OpenRouterCredits> {
  const res = await fetch(`${BASE_URL}/credits`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res.status === 401) throw new Error("Invalid API key");
  if (!res.ok) throw new Error(`Failed to fetch credits: ${res.status}`);
  const json = (await res.json()) as OpenRouterCreditsResponse;
  return json.data;
}

export function formatModelPrice(priceStr: string): string {
  const price = Number(priceStr);
  if (!price) return "Free";
  const perMillion = price * 1_000_000;
  if (perMillion < 0.01) return `$${(perMillion * 1000).toFixed(2)}/B`;
  return `$${perMillion.toFixed(2)}/M`;
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${Number((tokens / 1_000_000).toFixed(1))}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}
