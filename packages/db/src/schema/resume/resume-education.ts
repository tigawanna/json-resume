import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { embeddable, timestamps } from "./shared-columns";
import { uuidv7 } from "uuidv7";

export const resumeEducation = sqliteTable(
  "resume_education",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    school: text("school").notNull(),
    degree: text("degree").default("").notNull(),
    field: text("field").default("").notNull(),
    startDate: text("start_date").default("").notNull(),
    endDate: text("end_date").default("").notNull(),
    description: text("description").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
    userId: text("user_id"),
  },
  (table) => [index("resume_education_userId_idx").on(table.userId)],
);

export const resumeEducationBullet = sqliteTable(
  "resume_education_bullet",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    educationId: text("education_id")
      .notNull()
      .references(() => resumeEducation.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
  },
  (table) => [index("resume_education_bullet_educationId_idx").on(table.educationId)],
);
