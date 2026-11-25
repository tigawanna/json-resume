/** Public join is the spam target; claim is signed-in and can be looser. */
export const WAITLIST_JOIN_RATE_LIMIT = { ttlMs: 60_000, limit: 5 };
export const WAITLIST_CLAIM_RATE_LIMIT = { ttlMs: 60_000, limit:5 };
