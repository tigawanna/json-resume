export interface OpenRouterModelPricing {
  prompt: string;
  completion: string;
  image?: string;
  request?: string;
  input_cache_read?: string;
  input_cache_write?: string;
}

export interface OpenRouterModelArchitecture {
  tokenizer: string;
  instruct_type: string | null;
  modality: string;
}

export interface OpenRouterModelTopProvider {
  context_length?: number;
  max_completion_tokens?: number | null;
  is_moderated: boolean;
}

export interface OpenRouterModelData {
  id: string;
  name: string;
  description: string;
  created?: number;
  context_length: number;
  architecture: OpenRouterModelArchitecture;
  pricing: OpenRouterModelPricing;
  top_provider: OpenRouterModelTopProvider;
  per_request_limits: Record<string, number | null> | null;
  supported_parameters?: string[];
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModelData[];
}

/** One provider deployment of a model, from `/models/{author}/{slug}/endpoints`. */
export interface OpenRouterModelEndpoint {
  name: string;
  provider_name: string;
  /** Routing slug, optionally with a variant suffix (e.g. `deepinfra/fp8`, `google-vertex/eu`). */
  tag: string;
  context_length: number;
  max_completion_tokens: number | null;
  quantization: string | null;
  pricing: OpenRouterModelPricing;
  supported_parameters: string[];
  status: number;
  uptime_last_1d?: number | null;
  latency_last_30m?: number | null;
  throughput_last_30m?: number | null;
}

export interface OpenRouterModelEndpointsResponse {
  data: {
    id: string;
    name: string;
    endpoints: OpenRouterModelEndpoint[];
  };
}

export interface OpenRouterCredits {
  total_credits: number;
  total_usage: number;
  total_credits_str: string;
  total_usage_str: string;
  remaining_credits_display: number;
}

export interface OpenRouterCreditsResponse {
  data: OpenRouterCredits;
}

/** One spend cap OpenRouter enforces for this key, from `GET /api/v1/key`. */
export interface OpenRouterKeyBudget {
  scope: string;
  limit_usd: number;
  remaining_usd: number;
  reset_interval: "daily" | "weekly" | "monthly" | null;
}

/** The key's own cap, plus the budget that would block a request first. */
export interface OpenRouterKeyLimits {
  limit: number | null;
  limit_remaining: number | null;
  limit_reset: string | null;
  effective_budget: OpenRouterKeyBudget | null;
}

export interface OpenRouterKeyResponse {
  data: OpenRouterKeyLimits;
}
