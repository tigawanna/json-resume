/* CRUD helpers for job application answer rows. */
import type { AppDb } from "../collection";
import type { ApplicationAnswer } from "../schemas";
import { joinSearchable, libraryRowBase, nowMs } from "@/routes/_dashboard/-utils/row-helpers";

export type ApplicationAnswerDraft = {
  question?: string;
  answer?: string;
  resumeId?: string | null;
  jobId?: string | null;
  sortOrder?: number;
};

/** `[[what only you know]]` marks a gap the assistant left for the user to fill. */
const PLACEHOLDER = /\[\[[^\]]*\]\]/g;

export function answerPlaceholders(answer: string): string[] {
  return answer.match(PLACEHOLDER) ?? [];
}

export function answerWordCount(answer: string) {
  return answer.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/** Position after the last question already saved for the same job (or with no job). */
export function nextAnswerSortOrder(db: AppDb, jobId: string | null) {
  let last = -1;
  for (const row of db.collections.applicationAnswer.toArray) {
    if ((row.jobId ?? null) === jobId) last = Math.max(last, row.sortOrder);
  }
  return last + 1;
}

export function insertApplicationAnswer(
  db: AppDb,
  userId: string | null | undefined,
  draft: ApplicationAnswerDraft,
): ApplicationAnswer {
  const base = libraryRowBase(userId);
  const jobId = draft.jobId ?? null;
  const question = draft.question?.trim() ?? "";
  const answer = draft.answer?.trim() ?? "";
  const row: ApplicationAnswer = {
    id: base.id,
    userId: userId ?? null,
    question,
    answer,
    resumeId: draft.resumeId ?? null,
    jobId,
    sortOrder: draft.sortOrder ?? nextAnswerSortOrder(db, jobId),
    searchableText: joinSearchable(question, answer),
    embedding: null,
    embeddingModel: null,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  };
  db.collections.applicationAnswer.insert(row);
  return row;
}

/** Fields left out of `draft` keep their current value. */
export function updateApplicationAnswer(
  db: AppDb,
  answerId: string,
  draft: ApplicationAnswerDraft,
): ApplicationAnswer {
  const existing = db.collections.applicationAnswer.get(answerId);
  if (!existing) {
    throw new Error(`Application answer ${answerId} was not found.`);
  }
  const question = draft.question === undefined ? existing.question : draft.question.trim();
  const answer = draft.answer === undefined ? existing.answer : draft.answer.trim();
  db.collections.applicationAnswer.update(answerId, (row) => {
    row.question = question;
    row.answer = answer;
    if (draft.resumeId !== undefined) row.resumeId = draft.resumeId;
    if (draft.jobId !== undefined) row.jobId = draft.jobId;
    if (draft.sortOrder !== undefined) row.sortOrder = draft.sortOrder;
    row.searchableText = joinSearchable(question, answer);
    row.updatedAt = nowMs();
  });
  const updated = db.collections.applicationAnswer.get(answerId);
  if (!updated) {
    throw new Error(`Application answer ${answerId} was not found after update.`);
  }
  return updated;
}

export function deleteApplicationAnswer(db: AppDb, answerId: string) {
  db.collections.applicationAnswer.delete(answerId);
}

/** Question order on the form, then oldest first. */
export function compareApplicationAnswers(
  a: Pick<ApplicationAnswer, "sortOrder" | "createdAt">,
  b: Pick<ApplicationAnswer, "sortOrder" | "createdAt">,
) {
  return a.sortOrder - b.sortOrder || a.createdAt - b.createdAt;
}

/** Pasted questions, one per line, without list bullets or numbering. */
export function parseQuestions(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

/** "Question\n\nAnswer" blocks for pasting a whole application at once. */
export function applicationAnswersText(
  rows: ReadonlyArray<Pick<ApplicationAnswer, "question" | "answer">>,
) {
  return rows.map((row) => `${row.question}\n\n${row.answer}`.trim()).join("\n\n\n");
}
