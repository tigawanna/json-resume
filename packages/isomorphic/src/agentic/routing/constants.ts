/**
 * Output ceiling for one agent turn. Reasoning tokens count against it, and a
 * tailored résumé written through tool arguments can run past 10K tokens.
 */
export const AGENT_MAX_OUTPUT_TOKENS = 32_768;

/** Endpoints capped below this cannot fit a full résumé rewrite plus reasoning. */
export const LOW_OUTPUT_CAP_TOKENS = 16_384;
