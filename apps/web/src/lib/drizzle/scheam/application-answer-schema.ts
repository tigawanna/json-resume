import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
import { embeddable, timestamps } from "./resume/shared-columns";

/** One question from a job application form and the answer written for it. */
export const applicationAnswer = sqliteTable(
  "application_answer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    question: text("question").default("").notNull(),
    /** Plain text, pasted as-is into application forms. */
    answer: text("answer").default("").notNull(),
    /** Résumé the answer was written with. No foreign key: deleting the résumé keeps the answer. */
    resumeId: text("resume_id"),
    /** Tracked job whose application asked the question. */
    jobId: text("job_id"),
    /** Order of the question on its application form. */
    sortOrder: integer("sort_order").default(0).notNull(),
    ...embeddable,
    ...timestamps,
  },
  (table) => [
    index("application_answer_userId_idx").on(table.userId),
    index("application_answer_userId_updatedAt_idx").on(table.userId, table.updatedAt),
    index("application_answer_jobId_idx").on(table.jobId),
    index("application_answer_resumeId_idx").on(table.resumeId),
  ],
);

export const applicationAnswerRelations = relations(applicationAnswer, ({ one }) => ({
  user: one(user, {
    fields: [applicationAnswer.userId],
    references: [user.id],
  }),
}));
