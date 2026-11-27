import { bigint, integer, pgTable, text } from "drizzle-orm/pg-core";

/** Shared throttler counters, so every Nest instance sees the same budget. */
export const rateLimitCounter = pgTable("rate_limit_counter", {
  key: text("key").primaryKey(),
  hits: integer("hits").notNull().default(0),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  blockedUntil: bigint("blocked_until", { mode: "number" }).default(0).notNull(),
});
