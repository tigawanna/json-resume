import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { embeddable, timestamps } from "./shared-columns.ts";

/** A reusable group name; each résumé picks its own skills under it (`resume.layout`). */
export const resumeSkillGroup = pgTable(
  "resume_skill_group",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [index("resume_skill_group_userId_idx").on(table.userId)],
);

/** One row per distinct skill name per user. */
export const resumeSkill = pgTable(
  "resume_skill",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id"),
    name: text("name").notNull(),
    /** Optional proficiency: beginner | intermediate | advanced | expert */
    level: text("level"),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
  },
  (table) => [index("resume_skill_userId_idx").on(table.userId)],
);
