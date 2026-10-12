import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import {
  coverLetterPreview,
  coverLetterWordCount,
  insertCoverLetter,
  latestCoverLetterForResume,
  updateCoverLetter,
} from "@/data-access-layer/event-sourced/cover-letter-rows";
import type { CoverLetter } from "@/data-access-layer/event-sourced/schemas";
import {
  getCoverLetterToolInputSchema,
  listCoverLettersToolInputSchema,
  saveCoverLetterToolInputSchema,
  type CoverLetterDetail,
  type CoverLetterRow,
  type GetCoverLetterToolInput,
  type GetCoverLetterToolOutput,
  type ListCoverLettersToolInput,
  type ListCoverLettersToolOutput,
  type SaveCoverLetterToolInput,
  type SaveCoverLetterToolOutput,
} from "@/features/agentic-tools/cover-letter-tool-schemas";
import type { LocalToolContext } from "@/features/agentic-tools/definitions/tool-context";
import { nextOffset, searchTerms } from "@/features/agentic-tools/shared/search-page";
import { count, eq, queryOnce, type InitialQueryBuilder } from "@tanstack/db";
import { orIlike } from "../../-utils/list-query";
import { requireJob } from "./local-job-tools";
import { targetResumeId } from "./local-resume-tools";

function coverLetterFields(letter: CoverLetter) {
  return {
    id: letter.id,
    title: letter.title,
    resumeId: letter.resumeId ?? null,
    jobId: letter.jobId ?? null,
    wordCount: coverLetterWordCount(letter.body),
    updatedAt: new Date(letter.updatedAt).toISOString(),
  };
}

export function coverLetterRowView(letter: CoverLetter): CoverLetterRow {
  return { ...coverLetterFields(letter), preview: coverLetterPreview(letter.body) };
}

function coverLetterDetailView(letter: CoverLetter): CoverLetterDetail {
  return { ...coverLetterFields(letter), body: letter.body };
}

function requireCoverLetter(db: AppDb, coverLetterId: string): CoverLetter {
  const letter = db.collections.coverLetter.get(coverLetterId);
  if (!letter) {
    throw new Error(
      `Cover letter ${coverLetterId} was not found. Use list_cover_letters to find its id.`,
    );
  }
  return letter;
}

function requireResumeId(db: AppDb, resumeId: string) {
  if (!db.collections.resume.has(resumeId)) {
    throw new Error(`Resume ${resumeId} was not found. Use list_resumes to find its id.`);
  }
  return resumeId;
}

export function saveLocalCoverLetter(
  ctx: LocalToolContext,
  input: SaveCoverLetterToolInput,
): SaveCoverLetterToolOutput {
  const data = saveCoverLetterToolInputSchema.parse(input);
  if (data.resumeId) requireResumeId(ctx.db, data.resumeId);
  if (data.jobId) requireJob(ctx.db, data.jobId);

  if (data.coverLetterId) {
    requireCoverLetter(ctx.db, data.coverLetterId);
    const letter = updateCoverLetter(ctx.db, data.coverLetterId, {
      title: data.title,
      body: data.body,
      resumeId: data.resumeId,
      jobId: data.jobId,
    });
    return { coverLetter: coverLetterRowView(letter), created: false };
  }

  if (!data.body) {
    throw new Error("Pass the letter as body to create a cover letter.");
  }
  const resumeId = data.resumeId || ctx.getActiveResumeId() || null;
  const jobId =
    data.jobId || (resumeId ? ctx.db.collections.resume.get(resumeId)?.jobId : null) || null;
  const letter = insertCoverLetter(ctx.db, ctx.userId, {
    title: data.title,
    body: data.body,
    resumeId,
    jobId,
  });
  return { coverLetter: coverLetterRowView(letter), created: true };
}

export function getLocalCoverLetter(
  ctx: LocalToolContext,
  input: GetCoverLetterToolInput,
): GetCoverLetterToolOutput {
  const data = getCoverLetterToolInputSchema.parse(input);
  if (data.coverLetterId) {
    return { coverLetter: coverLetterDetailView(requireCoverLetter(ctx.db, data.coverLetterId)) };
  }
  const resumeId = targetResumeId(ctx, data.resumeId);
  const letter = latestCoverLetterForResume(ctx.db.collections.coverLetter.toArray, resumeId);
  if (!letter) {
    throw new Error(
      `Resume ${resumeId} has no cover letter yet. Write one with save_cover_letter when the user asks.`,
    );
  }
  return { coverLetter: coverLetterDetailView(letter) };
}

/** Letters for `resumeId` (when given) where every term matches the title or text. */
function matchingCoverLetters(
  q: InitialQueryBuilder,
  db: AppDb,
  terms: ReadonlyArray<string>,
  resumeId: string | undefined,
) {
  let query = q.from({ letter: db.collections.coverLetter });
  if (resumeId) query = query.where(({ letter }) => eq(letter.resumeId, resumeId));
  for (const term of terms) {
    query = query.where(({ letter }) => orIlike(term, letter.title, letter.body));
  }
  return query;
}

export async function listLocalCoverLetters(
  ctx: Pick<LocalToolContext, "db">,
  input: ListCoverLettersToolInput,
): Promise<ListCoverLettersToolOutput> {
  const data = listCoverLettersToolInputSchema.parse(input);
  const terms = searchTerms(data.keyword);

  const [rows, totals] = await Promise.all([
    queryOnce((q) =>
      matchingCoverLetters(q, ctx.db, terms, data.resumeId)
        .orderBy(({ letter }) => letter.updatedAt, "desc")
        .orderBy(({ letter }) => letter.id, "desc")
        .offset(data.offset)
        .limit(data.limit),
    ),
    queryOnce((q) =>
      matchingCoverLetters(q, ctx.db, terms, data.resumeId).select(({ letter }) => ({
        total: count(letter.id),
      })),
    ),
  ]);
  const total = totals[0]?.total ?? 0;

  return {
    coverLetters: rows.map(coverLetterRowView),
    total,
    nextOffset: nextOffset(total, data.offset, rows.length),
  };
}
