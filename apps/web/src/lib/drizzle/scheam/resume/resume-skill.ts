import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { resume } from "./resume";
import { embeddable, timestamps } from "./shared-columns";

export const resumeSkillGroup = sqliteTable(
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

export const resumeSkillGroupItem = sqliteTable(
  "resume_skill_group_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => resumeSkillGroup.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_skill_group_item_resumeId_idx").on(table.resumeId),
    index("resume_skill_group_item_groupId_idx").on(table.groupId),
    uniqueIndex("resume_skill_group_item_unique_idx").on(table.resumeId, table.groupId),
  ],
);

/** One row per distinct skill name per user; groups reference it through `resume_skill_group_skill`. */
export const resumeSkill = sqliteTable(
  "resume_skill",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id"),
    /** Legacy owner group. Compaction moves it into `resume_skill_group_skill` and clears it. */
    groupId: text("group_id").references(() => resumeSkillGroup.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    /** Optional proficiency: beginner | intermediate | advanced | expert */
    level: text("level"),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
  },
  (table) => [
    index("resume_skill_groupId_idx").on(table.groupId),
    index("resume_skill_userId_idx").on(table.userId),
  ],
);

export const resumeSkillGroupSkill = sqliteTable(
  "resume_skill_group_skill",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    groupId: text("group_id")
      .notNull()
      .references(() => resumeSkillGroup.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => resumeSkill.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_skill_group_skill_groupId_idx").on(table.groupId),
    index("resume_skill_group_skill_skillId_idx").on(table.skillId),
    uniqueIndex("resume_skill_group_skill_unique_idx").on(table.groupId, table.skillId),
  ],
);
