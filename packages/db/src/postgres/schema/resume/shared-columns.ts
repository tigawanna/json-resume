import { customType, text, timestamp } from "drizzle-orm/pg-core";

export const timestamptz = (name: string) =>
  timestamp(name, { mode: "date", precision: 3, withTimezone: true });

export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const timestamps = {
  createdAt: timestamptz("created_at").defaultNow().notNull(),
  updatedAt: timestamptz("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

// Stored as bytea to preserve the existing Buffer API. Vector search can be
// implemented later with pgvector and a dedicated migration.
export const embeddable = {
  searchableText: text("searchable_text").default("").notNull(),
  embedding: bytea("embedding"),
  embeddingModel: text("embedding_model"),
};
