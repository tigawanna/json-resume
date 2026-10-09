import { z } from "zod";
import type { AppDb } from "./collection";
import type { Job, JobStatus, Resume } from "./schemas";
import { jobStatusSchema } from "./schemas";
import { joinSearchable, libraryRowBase, nowMs } from "@/routes/_dashboard/-utils/row-helpers";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  archived: "Archived",
};

export const JOB_STATUS_OPTIONS = jobStatusSchema.options.map((value) => ({
  value,
  label: JOB_STATUS_LABELS[value],
}));

/** Only the posting text is required; every other field may be filled in later. */
export type JobDraft = {
  description: string;
  company?: string;
  title?: string;
  url?: string;
  location?: string;
  status?: JobStatus;
  notes?: string;
  appliedAt?: number | null;
};

function jobSearchableText(draft: {
  company: string;
  title: string;
  description: string;
  location: string;
  url: string;
  notes: string;
}) {
  return joinSearchable(
    draft.company,
    draft.title,
    draft.location,
    draft.url,
    draft.notes,
    draft.description,
  );
}

function normalizeDraft(draft: JobDraft) {
  const company = draft.company?.trim() ?? "";
  const description = draft.description.trim();
  const title = draft.title?.trim() ?? "";
  const url = draft.url?.trim() ?? "";
  const location = draft.location?.trim() ?? "";
  const notes = draft.notes?.trim() ?? "";
  const status = draft.status ?? "saved";
  const appliedAt =
    draft.appliedAt === undefined
      ? status === "applied" || status === "interviewing" || status === "offer"
        ? nowMs()
        : null
      : draft.appliedAt;
  return { company, description, title, url, location, notes, status, appliedAt };
}

export function insertJob(db: AppDb, userId: string | null | undefined, draft: JobDraft): Job {
  const value = normalizeDraft(draft);
  if (!value.description) {
    throw new Error("Job description is required.");
  }
  const base = libraryRowBase(userId);
  const row: Job = {
    id: base.id,
    userId: userId ?? null,
    company: value.company,
    title: value.title,
    description: value.description,
    url: value.url,
    location: value.location,
    status: value.status,
    notes: value.notes,
    appliedAt: value.appliedAt,
    searchableText: jobSearchableText(value),
    embedding: null,
    embeddingModel: null,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  };
  db.collections.job.insert(row);
  return row;
}

/** Fields left out of `draft` keep their current value. */
export function updateJob(db: AppDb, jobId: string, draft: Partial<JobDraft>): Job {
  const existing = db.collections.job.get(jobId);
  if (!existing) {
    throw new Error(`Job ${jobId} was not found.`);
  }
  const value = normalizeDraft({
    company: draft.company ?? existing.company,
    description: draft.description ?? existing.description,
    title: draft.title ?? existing.title,
    url: draft.url ?? existing.url,
    location: draft.location ?? existing.location,
    status: draft.status ?? existing.status,
    notes: draft.notes ?? existing.notes,
    appliedAt: draft.appliedAt === undefined ? existing.appliedAt : draft.appliedAt,
  });
  if (!value.description) {
    throw new Error("Job description is required.");
  }
  db.collections.job.update(jobId, (row) => {
    row.company = value.company;
    row.title = value.title;
    row.description = value.description;
    row.url = value.url;
    row.location = value.location;
    row.status = value.status;
    row.notes = value.notes;
    row.appliedAt = value.appliedAt;
    row.searchableText = jobSearchableText(value);
    row.updatedAt = nowMs();
  });
  const updated = db.collections.job.get(jobId);
  if (!updated) {
    throw new Error(`Job ${jobId} was not found after update.`);
  }
  return updated;
}

/**
 * Résumés saved before jobs were tracked separately kept the posting on the row
 * as `jobDescription`. Stored rows keep it until the résumé is linked or
 * unlinked (which blanks it), so it can be moved into a job.
 */
const LEGACY_JOB_DESCRIPTION_KEY = "jobDescription";
const legacyJobDescriptionSchema = z.object({ [LEGACY_JOB_DESCRIPTION_KEY]: z.string() });

export function legacyJobDescription(resume: object): string {
  const parsed = legacyJobDescriptionSchema.safeParse(resume);
  return parsed.success ? parsed.data[LEGACY_JOB_DESCRIPTION_KEY].trim() : "";
}

export function attachJobToResume(db: AppDb, resumeId: string, jobId: string | null) {
  if (!db.collections.resume.has(resumeId)) {
    throw new Error(`Resume ${resumeId} was not found.`);
  }
  if (jobId && !db.collections.job.has(jobId)) {
    throw new Error(`Job ${jobId} was not found.`);
  }
  db.collections.resume.update(resumeId, (row) => {
    row.jobId = jobId;
    // Updates merge into the stored row, so a deleted key would survive; blank it instead.
    if (Object.hasOwn(row, LEGACY_JOB_DESCRIPTION_KEY)) {
      Reflect.set(row, LEGACY_JOB_DESCRIPTION_KEY, "");
    }
    row.updatedAt = nowMs();
  });
}

/** Saves the résumé's target job: edits the linked job, or creates one and links it. */
export function saveResumeTargetJob(
  db: AppDb,
  userId: string | null | undefined,
  resumeId: string,
  draft: JobDraft,
): Job {
  const resume = db.collections.resume.get(resumeId);
  if (!resume) {
    throw new Error(`Resume ${resumeId} was not found.`);
  }
  const linked = resume.jobId ? db.collections.job.get(resume.jobId) : undefined;
  if (linked) return updateJob(db, linked.id, draft);
  const job = insertJob(db, userId, draft);
  attachJobToResume(db, resumeId, job.id);
  return job;
}

/** Links the résumé to a job with this posting text, reusing an identical one before creating a row. */
export function attachJobDescription(
  db: AppDb,
  userId: string | null | undefined,
  resumeId: string,
  description: string,
): Job | null {
  const text = description.trim();
  if (!text) return null;
  const job = findJobByDescription(db, text) ?? insertJob(db, userId, { description: text });
  attachJobToResume(db, resumeId, job.id);
  return job;
}

/** A tracked job with the same posting text, ignoring whitespace differences. */
export function findJobByDescription(db: AppDb, description: string): Job | undefined {
  const key = normalizeJobDescription(description);
  return db.collections.job.toArray.find((row) => normalizeJobDescription(row.description) === key);
}

export function unlinkJobFromResumes(db: AppDb, jobId: string) {
  for (const resume of db.collections.resume.toArray) {
    if (resume.jobId !== jobId) continue;
    db.collections.resume.update(resume.id, (row) => {
      row.jobId = null;
      row.updatedAt = nowMs();
    });
  }
}

export function deleteJob(db: AppDb, jobId: string) {
  unlinkJobFromResumes(db, jobId);
  db.collections.job.delete(jobId);
}

export function linkedJob(resume: Pick<Resume, "jobId">, jobs: ReadonlyArray<Job>): Job | null {
  if (!resume.jobId) return null;
  return jobs.find((row) => row.id === resume.jobId) ?? null;
}

export function jobDescriptionPreview(text: string, max = 240) {
  const flat = text.trim().replace(/\s+/g, " ");
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

export function jobListLabel(job: Pick<Job, "company" | "title" | "description">) {
  const company = job.company.trim();
  const title = job.title.trim();
  if (company && title) return `${company} — ${title}`;
  if (company || title) return company || title;
  return jobDescriptionPreview(job.description, 60) || "Untitled job";
}

/** Jobs matching `query` in any text field, most recently updated first. */
export function searchJobs<T extends Job>(jobs: ReadonlyArray<T>, query: string): T[] {
  const needle = query.trim().toLowerCase();
  return jobs
    .filter(
      (job) =>
        !needle ||
        [job.company, job.title, job.location, job.url, job.notes, job.description].some((part) =>
          part.toLowerCase().includes(needle),
        ),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function normalizeJobDescription(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function guessCompanyFromDescription(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 12)) {
    const labeled = line.match(/^(?:company|employer|organization|org)\s*[:\-–]\s*(.+)$/i);
    const value = labeled?.[1]?.trim();
    if (value && value.length <= 80) return value;
  }
  const first = lines[0];
  if (first && first.length <= 60 && !first.includes(".") && first.split(/\s+/).length <= 8) {
    return first;
  }
  return "";
}

function guessCompanyFromResume(name: string, description: string) {
  const fromDescription = guessCompanyFromDescription(description);
  if (fromDescription) return fromDescription;
  const trimmed = name.trim();
  if (trimmed && !/^(untitled|new resume|resume|copy)(\s|$)/i.test(trimmed)) return trimmed;
  return "";
}

export type JobImportGroup = {
  key: string;
  description: string;
  resumeIds: string[];
  resumeNames: string[];
  suggestedCompany: string;
  existingJobId: string | null;
};

/** Résumés still carrying a legacy pasted posting and not linked to a live job row. */
export function listJobImportGroups(db: AppDb): JobImportGroup[] {
  const jobs = db.collections.job.toArray;
  const groups = new Map<string, JobImportGroup>();

  for (const resume of db.collections.resume.toArray) {
    const description = legacyJobDescription(resume);
    if (!description) continue;
    if (resume.jobId && jobs.some((job) => job.id === resume.jobId)) continue;

    const key = normalizeJobDescription(description);
    const existing = jobs.find((job) => normalizeJobDescription(job.description) === key);
    const suggested = guessCompanyFromResume(resume.name, description);
    const group = groups.get(key);
    if (group) {
      group.resumeIds.push(resume.id);
      group.resumeNames.push(resume.name);
      if (!group.suggestedCompany && suggested) group.suggestedCompany = suggested;
      continue;
    }
    groups.set(key, {
      key,
      description,
      resumeIds: [resume.id],
      resumeNames: [resume.name],
      suggestedCompany: suggested || existing?.company || "",
      existingJobId: existing?.id ?? null,
    });
  }

  return [...groups.values()];
}

export function importJobsFromResumeGroups(
  db: AppDb,
  userId: string | null | undefined,
  groups: ReadonlyArray<JobImportGroup>,
  selections: ReadonlyArray<{ key: string; company: string; title?: string }>,
) {
  let created = 0;
  let reused = 0;
  let attached = 0;
  let skipped = 0;

  for (const selection of selections) {
    const group = groups.find((item) => item.key === selection.key);
    if (!group) {
      skipped += 1;
      continue;
    }

    const existing = group.existingJobId ? db.collections.job.get(group.existingJobId) : undefined;
    let jobId: string;
    if (existing) {
      reused += 1;
      jobId = existing.id;
    } else {
      jobId = insertJob(db, userId, {
        company: selection.company,
        description: group.description,
        title: selection.title,
      }).id;
      created += 1;
    }

    for (const resumeId of group.resumeIds) {
      attachJobToResume(db, resumeId, jobId);
      attached += 1;
    }
  }

  return { created, reused, attached, skipped };
}
