export interface OpenRouterModelPricing {
  prompt: string;
  completion: string;
  image?: string;
  request?: string;
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
  context_length: number;
  architecture: OpenRouterModelArchitecture;
  pricing: OpenRouterModelPricing;
  top_provider: OpenRouterModelTopProvider;
  per_request_limits: Record<string, number | null> | null;
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModelData[];
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
