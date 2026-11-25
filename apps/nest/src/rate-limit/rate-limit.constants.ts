/** Fallback when a controller does not set `@Throttle`. */
export const HTTP_RATE_LIMIT = { ttlMs: 60_000, limit: 100 };
