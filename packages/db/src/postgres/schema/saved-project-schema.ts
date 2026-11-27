import { relations } from "drizzle-orm";
import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { user } from "./auth-schema.ts";
import { bytea, timestamps } from "./resume/shared-columns.ts";

export const savedProject = pgTable(
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
    embedding: bytea("embedding"),
    embeddingDimensions: integer("embedding_dimensions"),
    ...timestamps,
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
