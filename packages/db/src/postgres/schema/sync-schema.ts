import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  index,
  integer,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema.ts";
import { timestamptz } from "./resume/shared-columns.ts";

/**
 * Append-only event log for managed sync.
 * `user_id` is stamped from the session on push — never trusted from the client.
 */
export const syncEvent = pgTable(
  "sync_event",
  {
    globalSeq: bigserial("global_seq", { mode: "number" }).primaryKey(),
    eventId: text("event_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    collectionId: text("collection_id").notNull(),
    type: text("type", { enum: ["insert", "update", "delete"] }).notNull(),
    key: text("key").notNull(),
    payload: text("payload").notNull(),
    previous: text("previous"),
    txId: text("tx_id").notNull(),
    clientId: text("client_id").notNull(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    clientTimestamp: bigint("client_timestamp", { mode: "number" }).notNull(),
    serverTimestamp: timestamptz("server_timestamp").defaultNow().notNull(),
    projectedAt: timestamptz("projected_at"),
  },
  (table) => [
    uniqueIndex("sync_event_eventId_idx").on(table.eventId),
    index("sync_event_userId_globalSeq_idx").on(table.userId, table.globalSeq),
    index("sync_event_row_idx").on(table.collectionId, table.key, table.globalSeq),
    index("sync_event_userRow_idx").on(
      table.userId,
      table.collectionId,
      table.key,
      table.globalSeq,
    ),
    index("sync_event_projectedAt_idx").on(table.projectedAt),
  ],
);

export const syncEventRelations = relations(syncEvent, ({ one }) => ({
  user: one(user, {
    fields: [syncEvent.userId],
    references: [user.id],
  }),
}));

/**
 * How far the scheduled squash has walked each user's log. Every row touched at
 * or below `squashedThroughSeq` has had its earlier events removed.
 */
export const syncSquashState = pgTable(
  "sync_squash_state",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    squashedThroughSeq: bigint("squashed_through_seq", { mode: "number" }).default(0).notNull(),
    squashedAt: timestamptz("squashed_at"),
    removedEvents: integer("removed_events").default(0).notNull(),
  },
  (table) => [index("sync_squash_state_squashedAt_idx").on(table.squashedAt)],
);

/** Singleton identity of this event store. `id` is always 1. */
export const syncBackend = pgTable("sync_backend", {
  id: serial("id").primaryKey(),
  backendId: text("backend_id").notNull(),
  lastProjectedSeq: bigint("last_projected_seq", { mode: "number" }).default(0).notNull(),
});
