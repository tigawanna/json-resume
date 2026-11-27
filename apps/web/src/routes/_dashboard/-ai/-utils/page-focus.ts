import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import type { QueryCollection } from "@repo/isomorphic/agentic/tool-schemas/assistant-data";
import { jobListLabel } from "@/data-access-layer/event-sourced/rows/job-rows";
import {
  formatExperienceSnapshot,
  limitExperienceSnapshot,
  type ExperienceGroupSnapshot,
} from "@/features/agentic-tools/experience-snapshot";
import {
  companyGroupKey,
  splitCompanyHint,
} from "@/routes/_dashboard/experiences/-utils/split-company";

export type PageFocus = { collection: QueryCollection; id: string; title: string };

export function readFocus(
  db: AppDb,
  collection: QueryCollection | undefined,
  id: string | undefined,
): PageFocus | null {
  if (!collection || !id) return null;
  const title = rowTitle(db, collection, id);
  if (!title) return null;
  return { collection, id, title };
}

export function experienceGroup(db: AppDb, experienceId: string | undefined) {
  if (!experienceId) return null;
  const anchor = db.collections.resumeExperience.get(experienceId);
  if (!anchor) return null;
  const key = companyGroupKey(anchor.company, anchor.startDate, anchor.endDate);
  const titles = db.collections.resumeExperience.toArray
    .filter((row) => companyGroupKey(row.company, row.startDate, row.endDate) === key)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
  const company = splitCompanyHint(anchor.company).name || anchor.company;
  const label = `${company}, ${anchor.startDate || "?"}–${anchor.endDate || "?"}`;
  return { key, titles, label, anchor };
}

export function experienceSnapshotText(db: AppDb, experienceId: string | undefined) {
  const group = experienceGroup(db, experienceId);
  if (!group) return "";
  const snapshot: ExperienceGroupSnapshot = {
    company: group.anchor.company,
    startDate: group.anchor.startDate,
    endDate: group.anchor.endDate,
    titles: group.titles.map((title) => ({
      id: title.id,
      role: title.role,
      startDate: title.startDate,
      endDate: title.endDate,
      location: title.location,
      bullets: db.collections.resumeExperienceBullet.toArray
        .filter((bullet) => bullet.experienceId === title.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((bullet) => ({ id: bullet.id, text: bullet.text })),
    })),
  };
  return formatExperienceSnapshot(limitExperienceSnapshot(snapshot));
}

function rowTitle(db: AppDb, collection: QueryCollection, id: string) {
  switch (collection) {
    case "job": {
      const row = db.collections.job.get(id);
      return row ? jobListLabel(row) : null;
    }
    case "coverLetter":
      return db.collections.coverLetter.get(id)?.title ?? null;
    case "assistantSkill":
      return db.collections.assistantSkill.get(id)?.name ?? null;
    case "resumeExperience": {
      const group = experienceGroup(db, id);
      if (!group) return null;
      return `${group.anchor.role} · ${group.label}`;
    }
    default:
      return null;
  }
}
