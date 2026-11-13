import { sql } from "drizzle-orm";
import { blob, integer, text } from "drizzle-orm/sqlite-core";

// Turso-native vector search: embedding stored as F32_BLOB (via blob in Drizzle),
// query with vector32(), vector_distance_cos(), vector_top_k() at SQL level.
// FTS5 virtual tables can be created via raw SQL migrations over searchableText columns.

export const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" as const })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" as const })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
};

export const embeddable = {
  searchableText: text("searchable_text").default("").notNull(),
  embedding: blob("embedding", { mode: "buffer" as const }),
  embeddingModel: text("embedding_model"),
};
