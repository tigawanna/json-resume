import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export const pinnedProject = sqliteTable(
  "pinned_project",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    githubRepoId: integer("github_repo_id").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    description: text("description").default("").notNull(),
    repoUrl: text("repo_url").notNull(),
    homepageUrl: text("homepage_url").default("").notNull(),
    topics: text("topics").default("[]").notNull(),
    language: text("language").default("").notNull(),
    stargazersCount: integer("stargazers_count").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("pinned_project_userId_idx").on(table.userId),
    index("pinned_project_userId_githubRepoId_idx").on(table.userId, table.githubRepoId),
  ],
);

export const pinnedProjectRelations = relations(pinnedProject, ({ one }) => ({
  user: one(user, {
    fields: [pinnedProject.userId],
    references: [user.id],
  }),
}));
