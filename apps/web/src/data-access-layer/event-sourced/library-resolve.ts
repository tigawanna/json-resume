import { layoutReferencedIds } from "@/features/resume/resume-layout";
import { bulletKey, libraryKeys, norm } from "@/modules/library/library-keys";
import { rowsToDeleteWith } from "@/modules/library/library-references";
import { libraryRowBase, newId, nowMs } from "@/routes/_dashboard/-utils/row-helpers";
import type { AppDb } from "./collection";
import { removeFromLayouts } from "./resume-layout-rows";

type Keyed = { id: string; userId?: string | null };

/**
 * Natural key → id over one collection, scoped to an owner. `resolve` returns
 * the existing id or inserts once; later candidates in the same batch see it.
 */
export function libraryIndex<T extends Keyed>(
  rows: ReadonlyArray<T>,
  keyOf: (row: Record<string, unknown>) => string | null,
  userId: string,
) {
  const ids = new Map<string, string>();
  for (const row of rows) {
    if (row.userId != null && row.userId !== userId) continue;
    const key = keyOf(row);
    if (key && !ids.has(key)) ids.set(key, row.id);
  }
  return {
    resolve(candidate: Record<string, unknown>, insert: () => string): string {
      const key = keyOf(candidate);
      const hit = key ? ids.get(key) : undefined;
      if (hit) return hit;
      const id = insert();
      if (key) ids.set(key, id);
      return id;
    },
  };
}

export function contactIndex(db: AppDb, userId: string) {
  return libraryIndex(db.collections.resumeContact.toArray, libraryKeys.resumeContact, userId);
}
export function linkIndex(db: AppDb, userId: string) {
  return libraryIndex(db.collections.resumeLink.toArray, libraryKeys.resumeLink, userId);
}
export function summaryIndex(db: AppDb, userId: string) {
  return libraryIndex(db.collections.resumeSummary.toArray, libraryKeys.resumeSummary, userId);
}
export function noteIndex(db: AppDb, userId: string) {
  return libraryIndex(db.collections.resumeNote.toArray, libraryKeys.resumeNote, userId);
}
export function experienceIndex(db: AppDb, userId: string) {
  return libraryIndex(
    db.collections.resumeExperience.toArray,
    libraryKeys.resumeExperience,
    userId,
  );
}
export function educationIndex(db: AppDb, userId: string) {
  return libraryIndex(db.collections.resumeEducation.toArray, libraryKeys.resumeEducation, userId);
}
export function projectIndex(db: AppDb, userId: string) {
  return libraryIndex(db.collections.resumeProject.toArray, libraryKeys.resumeProject, userId);
}
export function talkIndex(db: AppDb, userId: string) {
  return libraryIndex(db.collections.resumeTalk.toArray, libraryKeys.resumeTalk, userId);
}

/** Skill library id for each name, inserting names the user has never used. */
export function resolveSkillIds(db: AppDb, userId: string, names: string[]): string[] {
  const index = libraryIndex(db.collections.resumeSkill.toArray, libraryKeys.resumeSkill, userId);
  const ids: string[] = [];
  for (const name of names) {
    if (!name.trim()) continue;
    const id = index.resolve({ name }, () => {
      const base = libraryRowBase(userId);
      db.collections.resumeSkill.insert({
        ...base,
        name: name.trim(),
        level: null,
        searchableText: name.trim(),
      });
      return base.id;
    });
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/**
 * The user's skill group with this name, or a new one. A group is a reusable
 * name; which of its skills show is chosen per résumé in the layout.
 */
export function resolveSkillGroup(db: AppDb, userId: string, name: string): string {
  const wanted = norm(name);
  for (const group of db.collections.resumeSkillGroup.toArray) {
    if (group.userId != null && group.userId !== userId) continue;
    if (norm(group.name) === wanted) return group.id;
  }
  const base = libraryRowBase(userId);
  db.collections.resumeSkillGroup.insert({
    ...base,
    name: name.trim(),
    searchableText: name.trim(),
  });
  return base.id;
}

/** An experience's library bullets in library order (what a newly added experience starts with). */
export function libraryBulletIds(db: AppDb, experienceId: string): string[] {
  return db.collections.resumeExperienceBullet.toArray
    .filter((bullet) => bullet.experienceId === experienceId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((bullet) => bullet.id);
}

/** Library bullet ids for these texts under one experience, inserting new wording once. */
export function resolveBulletIds(db: AppDb, experienceId: string, texts: string[]): string[] {
  const existing = new Map<string, string>();
  for (const bullet of db.collections.resumeExperienceBullet.toArray) {
    const key = bulletKey(bullet);
    if (key && !existing.has(key)) existing.set(key, bullet.id);
  }
  const ids: string[] = [];
  for (const text of texts) {
    const key = bulletKey({ experienceId, text });
    if (!key) continue;
    let id = existing.get(key);
    if (!id) {
      const ts = nowMs();
      id = newId();
      db.collections.resumeExperienceBullet.insert({
        id,
        experienceId,
        text,
        sortOrder: existing.size,
        searchableText: text,
        embedding: null,
        embeddingModel: null,
        createdAt: ts,
        updatedAt: ts,
      });
      existing.set(key, id);
    }
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

type DeletableCollection = { delete: (id: string) => unknown; toArray: ReadonlyArray<object> };

function collectionOf(db: AppDb, collectionId: string): DeletableCollection | undefined {
  const collections: Record<string, DeletableCollection> = db.collections;
  return collections[collectionId];
}

function rowsOf(db: AppDb, collectionId: string): ReadonlyArray<Record<string, unknown>> {
  const rows = collectionOf(db, collectionId)?.toArray ?? [];
  return rows.map((row) => ({ ...row }));
}

/** Ids of every library row a résumé's layout points at, including bullets and skills. */
export function linkedEntityIds(db: AppDb, resumeId: string): Set<string> {
  const layout = db.collections.resume.get(resumeId)?.layout;
  return layout ? layoutReferencedIds(layout) : new Set<string>();
}

/**
 * Deletes a row and the children whose required foreign key ties them to it
 * (an experience's bullets). Shared entities stay; stored layouts drop the
 * deleted ids.
 */
export function deleteWithReferences(db: AppDb, collectionId: string, id: string) {
  const rows = rowsToDeleteWith(collectionId, id, (child) => rowsOf(db, child));
  for (const row of rows) {
    collectionOf(db, row.collectionId)?.delete(row.id);
  }
  collectionOf(db, collectionId)?.delete(id);
  if (collectionId !== "resume") removeFromLayouts(db, [id, ...rows.map((row) => row.id)]);
}
