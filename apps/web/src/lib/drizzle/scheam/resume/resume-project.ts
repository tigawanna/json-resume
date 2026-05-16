import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { resume } from "./resume";
import { embeddable, timestamps } from "./shared-columns";
import { uuidv7 } from "uuidv7";

export const resumeProject = sqliteTable(
  "resume_project",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: text("name").notNull(),
    url: text("url").default("").notNull(),
    homepageUrl: text("homepage_url").default("").notNull(),
    description: text("description").default("").notNull(),
    /** JSON string array of technologies, e.g. '["React","TypeScript"]' */
    tech: text("tech").default("[]").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [index("resume_project_userId_idx").on(table.userId)],
);

export const resumeProjectItem = sqliteTable(
  "resume_project_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => resumeProject.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_project_item_resumeId_idx").on(table.resumeId),
    index("resume_project_item_projectId_idx").on(table.projectId),
    uniqueIndex("resume_project_item_unique_idx").on(table.resumeId, table.projectId),
  ],
);
