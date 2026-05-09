import type { OpenRouterModel } from "@/features/agentic-tools/openrouter-models";

export type AiStorageType = "local" | "session";

export interface AiCredentials {
  apiKey: string;
  model: OpenRouterModel;
}

export interface AiSettings extends AiCredentials {
  storageType: AiStorageType;
}
