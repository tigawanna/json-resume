import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { resume } from "./resume";
import { embeddable, timestamps } from "./shared-columns";

export const resumeExperience = sqliteTable(
  "resume_experience",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id").references(() => resume.id, { onDelete: "cascade" }),
    company: text("company").notNull(),
    role: text("role").notNull(),
    startDate: text("start_date").default("").notNull(),
    endDate: text("end_date").default("").notNull(),
    location: text("location").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [
    index("resume_experience_userId_idx").on(table.userId),
    index("resume_experience_resumeId_idx").on(table.resumeId),
  ],
);

export const resumeExperienceItem = sqliteTable(
  "resume_experience_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    experienceId: text("experience_id")
      .notNull()
      .references(() => resumeExperience.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_experience_item_resumeId_idx").on(table.resumeId),
    index("resume_experience_item_experienceId_idx").on(table.experienceId),
    uniqueIndex("resume_experience_item_unique_idx").on(table.resumeId, table.experienceId),
  ],
);

export const resumeExperienceBullet = sqliteTable(
  "resume_experience_bullet",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    experienceId: text("experience_id")
      .notNull()
      .references(() => resumeExperience.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
  },
  (table) => [index("resume_exp_bullet_experienceId_idx").on(table.experienceId)],
);
