import type { AiRouting } from "@/features/agentic-tools/openrouter-routing";

export type AiStorageType = "local" | "session";

export interface AiCredentials {
  apiKey: string;
  model: string;
}

export interface AiSettings extends AiCredentials {
  storageType: AiStorageType;
  routing?: AiRouting;
}
