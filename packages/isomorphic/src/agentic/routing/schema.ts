import { z } from "zod";
import { AGENT_MAX_OUTPUT_TOKENS } from "./constants.ts";

export const providerRoutingModes = ["auto", "official", "custom"] as const;
export const providerSorts = ["price", "throughput", "latency"] as const;

const providerSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9._-]*$/);

/**
 * How OpenRouter picks the upstream provider for the agent.
 * - `auto`: OpenRouter's router (keeps Auto Exacto tool-call routing), optionally sorted.
 * - `official`: the model lab's own API, e.g. DeepSeek for `deepseek/*`.
 * - `custom`: the providers the user ticked, tried in order.
 */
export const aiRoutingSchema = z.object({
  mode: z.enum(providerRoutingModes),
  providers: z.array(providerSlugSchema).max(16),
  sort: z.enum(providerSorts).optional(),
  allowFallbacks: z.boolean(),
  maxOutputTokens: z.number().int().positive().max(AGENT_MAX_OUTPUT_TOKENS).optional(),
});
export type AiRouting = z.infer<typeof aiRoutingSchema>;
export type ProviderRoutingMode = AiRouting["mode"];
export type ProviderSort = NonNullable<AiRouting["sort"]>;
