import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { embeddable, timestamps } from "./shared-columns";
import { uuidv7 } from "uuidv7";

export const resumeExperience = sqliteTable(
  "resume_experience",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
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
  (table) => [index("resume_experience_userId_idx").on(table.userId)],
);

export const resumeExperienceBullet = sqliteTable(
  "resume_experience_bullet",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
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
