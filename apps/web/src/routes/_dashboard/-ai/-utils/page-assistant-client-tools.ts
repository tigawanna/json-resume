import { experienceAiClientTools } from "@/routes/_dashboard/experiences/-utils/experience-ai-tools";
import { dashboardAssistantClientTools } from "./dashboard-client-tools";
import {
  mutateCollectionClientTool,
  queryCollectionClientTool,
  searchConversationsClientTool,
} from "./local-collection-tools";

/** Every tool the bubble can execute. The server sends only the pack for the open page. */
export const pageAssistantClientTools = [
  ...dashboardAssistantClientTools,
  ...experienceAiClientTools,
  queryCollectionClientTool,
  mutateCollectionClientTool,
  searchConversationsClientTool,
];
