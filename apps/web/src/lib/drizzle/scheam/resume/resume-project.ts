import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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
