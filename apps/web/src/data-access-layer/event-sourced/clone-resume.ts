import { resumeLayoutSchema } from "@/features/resume/resume-layout";
import { joinSearchable, newId, nowMs } from "@/routes/_dashboard/-utils/row-helpers";
import type { AppDb } from "./collection";
import { attachJobDescription } from "./job-rows";
import { currentLayout } from "./resume-layout-rows";

/** "CV" → "CV (copy)", then "CV (copy 2)", … ; cloning a copy counts from the original name. */
export function copyName(name: string, taken: Iterable<string>): string {
  const base = name.replace(/ \(copy(?: \d+)?\)$/, "");
  const used = new Set(taken);
  if (!used.has(`${base} (copy)`)) return `${base} (copy)`;
  let n = 2;
  while (used.has(`${base} (copy ${n})`)) n++;
  return `${base} (copy ${n})`;
}

export type CloneResumeOverrides = {
  name?: string;
  description?: string;
  /** Links the copy to a job with this posting instead of the source's job. */
  jobDescription?: string;
};

/**
 * A new résumé that points at the same library rows as the source: one insert
 * carrying a copy of the source's layout. No experience, project, skill, … is
 * duplicated, so text edits show in both while inclusion and order stay per résumé.
 */
export function cloneResume(db: AppDb, sourceId: string, overrides: CloneResumeOverrides = {}) {
  const resumes = db.collections.resume.toArray;
  const source = resumes.find((row) => row.id === sourceId);
  if (!source) throw new Error(`Resume ${sourceId} was not found in the local database.`);

  const ts = nowMs();
  const id = newId();
  const name =
    overrides.name?.trim() ||
    copyName(
      source.name,
      resumes.map((row) => row.name),
    );
  const description = overrides.description ?? source.description;

  db.collections.resume.insert({
    ...source,
    id,
    name,
    description,
    layout: resumeLayoutSchema.parse(currentLayout(db, sourceId)),
    searchableText: joinSearchable(name, source.fullName, source.headline, description),
    embedding: null,
    embeddingModel: null,
    createdAt: ts,
    updatedAt: ts,
  });
  if (overrides.jobDescription?.trim()) {
    attachJobDescription(db, source.userId, id, overrides.jobDescription);
  }
  return { resumeId: id, name };
}
