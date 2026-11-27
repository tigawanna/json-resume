import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Shared throttler counters, so every Nest instance sees the same budget. */
export const rateLimitCounter = sqliteTable("rate_limit_counter", {
  key: text("key").primaryKey(),
  hits: integer("hits").notNull().default(0),
  expiresAt: integer("expires_at").notNull(),
  blockedUntil: integer("blocked_until").notNull().default(0),
});
