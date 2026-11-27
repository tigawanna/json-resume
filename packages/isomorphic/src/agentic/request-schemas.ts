import { z } from "zod";
import { pageToolPacks } from "./definitions/page-tool-pack.ts";
import { ASSISTANT_SKILL_INSTRUCTIONS_MAX } from "./limits.ts";
import { EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS } from "./prompts/system-prompt.ts";
import { aiRoutingSchema } from "./routing/schema.ts";
import { QUERY_COLLECTIONS } from "./tool-schemas/assistant-data.ts";

export const dashboardAssistantForwardedPropsSchema = z.object({
  /** The user's local date, so "this month" matches their calendar. */
  today: z.iso.date(),
  slopGuard: z.boolean().optional(),
  skillInstructions: z.string().max(ASSISTANT_SKILL_INSTRUCTIONS_MAX).optional(),
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
  routing: aiRoutingSchema.optional(),
  conversationId: z.string().optional(),
  page: z.object({
    routeId: z.string(),
    pathname: z.string(),
    label: z.string(),
    summary: z.string(),
    instructions: z.string(),
    toolPack: z.enum(pageToolPacks),
    params: z.record(z.string(), z.string()),
    focus: z
      .object({
        collection: z.enum(QUERY_COLLECTIONS),
        id: z.string(),
        title: z.string(),
      })
      .nullable(),
    conversationStartedOn: z.string(),
    experienceSnapshot: z.string().max(50_000).optional(),
  }),
});
export type DashboardAssistantForwardedProps = z.infer<
  typeof dashboardAssistantForwardedPropsSchema
>;

export const eventSourcedResumeTailorForwardedPropsSchema = z.object({
  resumeId: z.string().trim().min(1),
  /** Null when the user detached the résumé from the conversation. */
  activeResumeId: z.string().trim().min(1).nullable().optional(),
  activeJobId: z.string().trim().min(1).optional(),
  activeJobLabel: z.string().trim().max(400).optional(),
  systemPrompt: z.string().max(EVENT_SOURCED_SYSTEM_PROMPT_MAX_CHARS).optional(),
  skillInstructions: z.string().max(ASSISTANT_SKILL_INSTRUCTIONS_MAX).optional(),
  slopGuard: z.boolean().optional(),
  apiKey: z.string().trim().optional(),
  model: z.string().trim().optional(),
  routing: aiRoutingSchema.optional(),
});
export type EventSourcedResumeTailorForwardedProps = z.infer<
  typeof eventSourcedResumeTailorForwardedPropsSchema
>;
