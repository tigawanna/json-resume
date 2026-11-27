import type { AiRouting } from "@repo/isomorphic/agentic/routing";

export type AiStorageType = "local" | "session";

export interface AiCredentials {
  apiKey: string;
  model: string;
}

export interface AiSettings extends AiCredentials {
  storageType: AiStorageType;
  routing?: AiRouting;
}
