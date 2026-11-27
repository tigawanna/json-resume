import { relations, sql } from "drizzle-orm";
import { blob, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "@repo/db/sqlite/schema/auth-schema";

export const savedProject = sqliteTable(
  "saved_project",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    homepageUrl: text("homepage_url").default("").notNull(),
    description: text("description").default("").notNull(),
    tech: text("tech").default("[]").notNull(),
    searchableText: text("searchable_text").notNull(),
    embedding: blob("embedding", { mode: "buffer" }),
    embeddingDimensions: integer("embedding_dimensions"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("saved_project_userId_idx").on(table.userId),
    index("saved_project_userId_updatedAt_idx").on(table.userId, table.updatedAt),
  ],
);

export const savedProjectRelations = relations(savedProject, ({ one }) => ({
  user: one(user, {
    fields: [savedProject.userId],
    references: [user.id],
  }),
}));
