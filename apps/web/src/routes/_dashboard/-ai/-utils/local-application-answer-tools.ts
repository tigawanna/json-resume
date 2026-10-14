import {
  answerPlaceholders,
  answerWordCount,
  insertApplicationAnswer,
  nextAnswerSortOrder,
  updateApplicationAnswer,
} from "@/data-access-layer/event-sourced/rows/application-answer-rows";
import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { jobListLabel } from "@/data-access-layer/event-sourced/rows/job-rows";
import type { ApplicationAnswer } from "@/data-access-layer/event-sourced/schemas";
import {
  saveApplicationAnswersToolInputSchema,
  searchApplicationAnswersToolInputSchema,
  type ApplicationAnswerRow,
  type SaveApplicationAnswersToolInput,
  type SaveApplicationAnswersToolOutput,
  type SearchApplicationAnswersToolInput,
  type SearchApplicationAnswersToolOutput,
} from "@/features/agentic-tools/application-answer-tool-schemas";
import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import { nextOffset, searchTerms } from "@/features/agentic-tools/shared/search-page";
import { count, eq, queryOnce, type InitialQueryBuilder } from "@tanstack/db";
import { orIlike } from "../../-utils/list-query";
import { requireJob } from "./local-job-tools";

export function applicationAnswerRowView(db: AppDb, row: ApplicationAnswer): ApplicationAnswerRow {
  const job = row.jobId ? db.collections.job.get(row.jobId) : undefined;
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    resumeId: row.resumeId ?? null,
    jobId: row.jobId ?? null,
    jobLabel: job ? jobListLabel(job) : null,
    wordCount: answerWordCount(row.answer),
    placeholders: answerPlaceholders(row.answer).length,
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function requireApplicationAnswer(db: AppDb, answerId: string): ApplicationAnswer {
  const row = db.collections.applicationAnswer.get(answerId);
  if (!row) {
    throw new Error(
      `Application answer ${answerId} was not found. Use search_application_answers to find its id.`,
    );
  }
  return row;
}

export function saveLocalApplicationAnswers(
  ctx: LocalToolContext,
  input: SaveApplicationAnswersToolInput,
): SaveApplicationAnswersToolOutput {
  const data = saveApplicationAnswersToolInputSchema.parse(input);
  if (data.resumeId && !ctx.db.collections.resume.has(data.resumeId)) {
    throw new Error(`Resume ${data.resumeId} was not found. Use list_resumes to find its id.`);
  }
  if (data.jobId) requireJob(ctx.db, data.jobId);
  for (const item of data.answers) {
    if (item.answerId) requireApplicationAnswer(ctx.db, item.answerId);
    else if (!item.question) throw new Error("Every new answer needs its question.");
  }

  const resumeId = data.resumeId || ctx.getActiveResumeId() || null;
  const jobId =
    data.jobId || (resumeId ? ctx.db.collections.resume.get(resumeId)?.jobId : null) || null;
  let sortOrder = nextAnswerSortOrder(ctx.db, jobId);
  let created = 0;
  let updated = 0;

  const rows = data.answers.map((item) => {
    if (item.answerId) {
      updated += 1;
      return updateApplicationAnswer(ctx.db, item.answerId, {
        question: item.question,
        answer: item.answer,
        resumeId: data.resumeId,
        jobId: data.jobId,
      });
    }
    created += 1;
    return insertApplicationAnswer(ctx.db, ctx.userId, {
      question: item.question,
      answer: item.answer,
      resumeId,
      jobId,
      sortOrder: sortOrder++,
    });
  });

  return {
    answers: rows.map((row) => applicationAnswerRowView(ctx.db, row)),
    created,
    updated,
  };
}

/** Answers matching every term in the question or answer, optionally for one job or résumé. */
function matchingAnswers(
  q: InitialQueryBuilder,
  db: AppDb,
  terms: ReadonlyArray<string>,
  filters: { jobId?: string; resumeId?: string },
) {
  let query = q.from({ row: db.collections.applicationAnswer });
  const { jobId, resumeId } = filters;
  if (jobId) query = query.where(({ row }) => eq(row.jobId, jobId));
  if (resumeId) query = query.where(({ row }) => eq(row.resumeId, resumeId));
  for (const term of terms) {
    query = query.where(({ row }) => orIlike(term, row.question, row.answer));
  }
  return query;
}

export async function searchLocalApplicationAnswers(
  ctx: Pick<LocalToolContext, "db">,
  input: SearchApplicationAnswersToolInput,
): Promise<SearchApplicationAnswersToolOutput> {
  const data = searchApplicationAnswersToolInputSchema.parse(input);
  if (data.answerIds?.length) {
    const rows = data.answerIds.map((id) => requireApplicationAnswer(ctx.db, id));
    return {
      answers: rows.map((row) => applicationAnswerRowView(ctx.db, row)),
      total: rows.length,
      nextOffset: null,
    };
  }
  const terms = searchTerms(data.keyword);
  const filters = { jobId: data.jobId, resumeId: data.resumeId };

  const [rows, totals] = await Promise.all([
    queryOnce((q) =>
      matchingAnswers(q, ctx.db, terms, filters)
        .orderBy(({ row }) => row.updatedAt, "desc")
        .orderBy(({ row }) => row.id, "desc")
        .offset(data.offset)
        .limit(data.limit),
    ),
    queryOnce((q) =>
      matchingAnswers(q, ctx.db, terms, filters).select(({ row }) => ({ total: count(row.id) })),
    ),
  ]);
  const total = totals[0]?.total ?? 0;

  return {
    answers: rows.map((row) => applicationAnswerRowView(ctx.db, row)),
    total,
    nextOffset: nextOffset(total, data.offset, rows.length),
  };
}
