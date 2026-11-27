import { index, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { user } from "../auth-schema.ts";
import { embeddable, timestamps } from "./shared-columns.ts";

export const resume = pgTable(
  "resume",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Internal label for this resume version (e.g. "Frontend 2025") */
    name: text("name").notNull(),
    /** Display name on the resume itself */
    fullName: text("full_name").default("").notNull(),
    /** Professional headline / title */
    headline: text("headline").default("").notNull(),
    /** Internal notes about this resume */
    description: text("description").default("").notNull(),
    /** Target job this résumé is tailored to; the posting text lives on `job.description`. */
    jobId: text("job_id"),
    /** Template used for rendering (classic, sidebar, accent, modern) */
    templateId: text("template_id").default("classic").notNull(),
    /** Sections and which library rows this résumé shows, in order (array position is the order) */
    layout: jsonb("layout").$type<Record<string, unknown>>(),
    ...embeddable,
    ...timestamps,
  },
  (table) => [
    index("resume_userId_idx").on(table.userId),
    index("resume_updatedAt_idx").on(table.updatedAt),
    index("resume_jobId_idx").on(table.jobId),
  ],
);
