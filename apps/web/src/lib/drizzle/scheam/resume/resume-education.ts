import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { resume } from "./resume";
import { embeddable, timestamps } from "./shared-columns";

export const resumeEducation = sqliteTable(
  "resume_education",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id").references(() => resume.id, { onDelete: "cascade" }),
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
  (table) => [
    index("resume_education_userId_idx").on(table.userId),
    index("resume_education_resumeId_idx").on(table.resumeId),
  ],
);

export const resumeEducationItem = sqliteTable(
  "resume_education_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    educationId: text("education_id")
      .notNull()
      .references(() => resumeEducation.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("resume_education_item_resumeId_idx").on(table.resumeId),
    index("resume_education_item_educationId_idx").on(table.educationId),
    uniqueIndex("resume_education_item_unique_idx").on(table.resumeId, table.educationId),
  ],
);

export const resumeEducationBullet = sqliteTable(
  "resume_education_bullet",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
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
