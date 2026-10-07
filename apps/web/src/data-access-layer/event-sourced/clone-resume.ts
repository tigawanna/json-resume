import { resumeJoins, type ResumeJoinCollectionId } from "@/modules/library/library-references";
import { joinSearchable, newId, nowMs } from "@/routes/_dashboard/-utils/row-helpers";
import type { AppDb } from "./collection";

type LinkRow = { id: string; resumeId: string; createdAt: number; updatedAt: number };
type CopyLinks = (sourceId: string, targetId: string, ts: number) => number;

function linkCopier<T extends LinkRow>(collection: {
  toArray: ReadonlyArray<T>;
  insert: (row: T) => unknown;
}): CopyLinks {
  return (sourceId, targetId, ts) => {
    const rows = collection.toArray.filter((row) => row.resumeId === sourceId);
    for (const row of rows) {
      collection.insert({ ...row, id: newId(), resumeId: targetId, createdAt: ts, updatedAt: ts });
    }
    return rows.length;
  };
}

/** `satisfies` keeps this in step with `resumeJoins`: a new résumé link table fails to compile until it is listed here. */
function linkCopiers(db: AppDb) {
  const c = db.collections;
  return {
    resumeSection: linkCopier(c.resumeSection),
    resumeContactItem: linkCopier(c.resumeContactItem),
    resumeLinkItem: linkCopier(c.resumeLinkItem),
    resumeSummaryItem: linkCopier(c.resumeSummaryItem),
    resumeNoteItem: linkCopier(c.resumeNoteItem),
    resumeExperienceItem: linkCopier(c.resumeExperienceItem),
    resumeExperienceBulletItem: linkCopier(c.resumeExperienceBulletItem),
    resumeEducationItem: linkCopier(c.resumeEducationItem),
    resumeProjectItem: linkCopier(c.resumeProjectItem),
    resumeSkillGroupItem: linkCopier(c.resumeSkillGroupItem),
    resumeTalkItem: linkCopier(c.resumeTalkItem),
    resumeCertificationItem: linkCopier(c.resumeCertificationItem),
    resumeVolunteerItem: linkCopier(c.resumeVolunteerItem),
    resumeLanguageItem: linkCopier(c.resumeLanguageItem),
  } satisfies Record<ResumeJoinCollectionId, CopyLinks>;
}

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
  jobDescription?: string;
};

/**
 * A new résumé that points at the same library rows as the source. Every
 * link in `resumeJoins` is copied (sections, items, bullet picks); no
 * experience, project, skill, … is duplicated, so text edits show in both
 * while inclusion and order stay per résumé.
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
  const jobDescription = overrides.jobDescription ?? source.jobDescription;

  db.collections.resume.insert({
    ...source,
    id,
    name,
    description,
    jobDescription,
    experienceOrder: [...(source.experienceOrder ?? [])],
    educationOrder: [...(source.educationOrder ?? [])],
    projectOrder: [...(source.projectOrder ?? [])],
    talkOrder: [...(source.talkOrder ?? [])],
    searchableText: joinSearchable(name, source.fullName, source.headline, description),
    embedding: null,
    embeddingModel: null,
    createdAt: ts,
    updatedAt: ts,
  });

  const copiers = linkCopiers(db);
  const links: Partial<Record<ResumeJoinCollectionId, number>> = {};
  for (const join of resumeJoins) {
    links[join.collectionId] = copiers[join.collectionId](sourceId, id, ts);
  }
  return { resumeId: id, name, links };
}
