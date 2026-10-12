import type { AppDb } from "./collection";
import { jobListLabel } from "./job-rows";
import type { CoverLetter } from "./schemas";
import { joinSearchable, libraryRowBase, nowMs } from "@/routes/_dashboard/-utils/row-helpers";

export type CoverLetterDraft = {
  title?: string;
  body?: string;
  resumeId?: string | null;
  jobId?: string | null;
};

/** "Acme — Senior Engineer" from the job, else the résumé name, else a generic label. */
export function defaultCoverLetterTitle(
  db: AppDb,
  links: { resumeId?: string | null; jobId?: string | null },
) {
  const job = links.jobId ? db.collections.job.get(links.jobId) : undefined;
  if (job && (job.company.trim() || job.title.trim())) return jobListLabel(job);
  const resume = links.resumeId ? db.collections.resume.get(links.resumeId) : undefined;
  if (resume?.name.trim()) return `${resume.name.trim()} cover letter`;
  return "Untitled cover letter";
}

export function insertCoverLetter(
  db: AppDb,
  userId: string | null | undefined,
  draft: CoverLetterDraft,
): CoverLetter {
  const base = libraryRowBase(userId);
  const resumeId = draft.resumeId ?? null;
  const jobId = draft.jobId ?? null;
  const title = draft.title?.trim() || defaultCoverLetterTitle(db, { resumeId, jobId });
  const body = draft.body?.trim() ?? "";
  const row: CoverLetter = {
    id: base.id,
    userId: userId ?? null,
    title,
    body,
    resumeId,
    jobId,
    searchableText: joinSearchable(title, body),
    embedding: null,
    embeddingModel: null,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  };
  db.collections.coverLetter.insert(row);
  return row;
}

/** Fields left out of `draft` keep their current value. */
export function updateCoverLetter(
  db: AppDb,
  coverLetterId: string,
  draft: CoverLetterDraft,
): CoverLetter {
  const existing = db.collections.coverLetter.get(coverLetterId);
  if (!existing) {
    throw new Error(`Cover letter ${coverLetterId} was not found.`);
  }
  const title = draft.title === undefined ? existing.title : draft.title.trim();
  const body = draft.body === undefined ? existing.body : draft.body.trim();
  db.collections.coverLetter.update(coverLetterId, (row) => {
    row.title = title;
    row.body = body;
    if (draft.resumeId !== undefined) row.resumeId = draft.resumeId;
    if (draft.jobId !== undefined) row.jobId = draft.jobId;
    row.searchableText = joinSearchable(title, body);
    row.updatedAt = nowMs();
  });
  const updated = db.collections.coverLetter.get(coverLetterId);
  if (!updated) {
    throw new Error(`Cover letter ${coverLetterId} was not found after update.`);
  }
  return updated;
}

export function deleteCoverLetter(db: AppDb, coverLetterId: string) {
  db.collections.coverLetter.delete(coverLetterId);
}

/** The most recently updated letter written for `resumeId`. */
export function latestCoverLetterForResume<T extends Pick<CoverLetter, "resumeId" | "updatedAt">>(
  letters: ReadonlyArray<T>,
  resumeId: string,
): T | undefined {
  let latest: T | undefined;
  for (const letter of letters) {
    if (letter.resumeId !== resumeId) continue;
    if (!latest || letter.updatedAt > latest.updatedAt) latest = letter;
  }
  return latest;
}

export function coverLetterWordCount(body: string) {
  return body.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

export function coverLetterPreview(body: string, max = 200) {
  const flat = body
    .replace(/[*_#>`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}
