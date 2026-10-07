import { bulletKey, libraryKeys, skillGroupKey } from "@/modules/library/library-keys";
import { resumeJoins, rowsToDeleteWith } from "@/modules/library/library-references";
import { libraryRowBase, newId, nowMs } from "@/routes/_dashboard/-utils/row-helpers";
import type { AppDb } from "./collection";
import { skillsForGroup } from "./assemble-resume-detail";

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
        groupId: null,
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

/** Writes a group's ordered skill links, replacing whatever it linked before. */
export function setGroupSkills(db: AppDb, groupId: string, skillIds: string[]) {
  for (const link of db.collections.resumeSkillGroupSkill.toArray) {
    if (link.groupId === groupId) db.collections.resumeSkillGroupSkill.delete(link.id);
  }
  const ts = nowMs();
  skillIds.forEach((skillId, sortOrder) => {
    db.collections.resumeSkillGroupSkill.insert({
      id: newId(),
      groupId,
      skillId,
      sortOrder,
      createdAt: ts,
      updatedAt: ts,
    });
  });
}

/** Existing group with this name and exactly these skills, or a new one. */
export function resolveSkillGroup(
  db: AppDb,
  userId: string,
  name: string,
  skillIds: string[],
): string {
  const skills = db.collections.resumeSkill.toArray;
  const links = db.collections.resumeSkillGroupSkill.toArray;
  const wanted = skillGroupKey(name, skillIds);
  for (const group of db.collections.resumeSkillGroup.toArray) {
    if (group.userId != null && group.userId !== userId) continue;
    const current = skillsForGroup(group.id, skills, links).map((skill) => skill.id);
    if (skillGroupKey(group.name, current) === wanted) return group.id;
  }
  const base = libraryRowBase(userId);
  const names = skillIds.map((id) => skills.find((skill) => skill.id === id)?.name ?? "");
  db.collections.resumeSkillGroup.insert({
    ...base,
    name,
    searchableText: [name, ...names].join(" "),
  });
  setGroupSkills(db, base.id, skillIds);
  return base.id;
}

/**
 * Bullets predating bullet links show on every résumé using the experience.
 * Give those résumés explicit links before one of them diverges.
 */
export function ensureBulletLinks(db: AppDb, experienceId: string) {
  const bullets = db.collections.resumeExperienceBullet.toArray
    .filter((bullet) => bullet.experienceId === experienceId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (bullets.length === 0) return;
  const ids = new Set(bullets.map((bullet) => bullet.id));
  if (db.collections.resumeExperienceBulletItem.toArray.some((item) => ids.has(item.bulletId))) {
    return;
  }
  const ts = nowMs();
  const resumeIds = new Set(
    db.collections.resumeExperienceItem.toArray
      .filter((item) => item.experienceId === experienceId)
      .map((item) => item.resumeId),
  );
  for (const resumeId of resumeIds) {
    bullets.forEach((bullet, sortOrder) => {
      db.collections.resumeExperienceBulletItem.insert({
        id: newId(),
        resumeId,
        bulletId: bullet.id,
        sortOrder,
        createdAt: ts,
        updatedAt: ts,
      });
    });
  }
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

/** Replaces which of an experience's bullets this résumé shows. Library bullets stay. */
export function setResumeBullets(
  db: AppDb,
  resumeId: string,
  experienceId: string,
  texts: string[],
) {
  ensureBulletLinks(db, experienceId);
  const ownIds = new Set(
    db.collections.resumeExperienceBullet.toArray
      .filter((bullet) => bullet.experienceId === experienceId)
      .map((bullet) => bullet.id),
  );
  for (const item of db.collections.resumeExperienceBulletItem.toArray) {
    if (item.resumeId === resumeId && ownIds.has(item.bulletId)) {
      db.collections.resumeExperienceBulletItem.delete(item.id);
    }
  }
  const ts = nowMs();
  resolveBulletIds(db, experienceId, texts).forEach((bulletId, sortOrder) => {
    db.collections.resumeExperienceBulletItem.insert({
      id: newId(),
      resumeId,
      bulletId,
      sortOrder,
      createdAt: ts,
      updatedAt: ts,
    });
  });
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

/** Ids of every library row a résumé points at, including skills of its groups. */
export function linkedEntityIds(db: AppDb, resumeId: string): Set<string> {
  const ids = new Set<string>();
  for (const join of resumeJoins) {
    for (const row of rowsOf(db, join.collectionId)) {
      if (row.resumeId !== resumeId) continue;
      for (const [field, value] of Object.entries(row)) {
        if (field !== "id" && field !== "resumeId" && field.endsWith("Id")) {
          if (typeof value === "string") ids.add(value);
        }
      }
    }
  }
  for (const link of rowsOf(db, "resumeSkillGroupSkill")) {
    if (typeof link.groupId === "string" && ids.has(link.groupId)) {
      if (typeof link.skillId === "string") ids.add(link.skillId);
    }
  }
  return ids;
}

/**
 * Deletes a parent and only the rows that point from it: join rows, plus
 * children whose required foreign key ties them to it. Shared entities stay.
 */
export function deleteWithReferences(db: AppDb, collectionId: string, id: string) {
  for (const row of rowsToDeleteWith(collectionId, id, (child) => rowsOf(db, child))) {
    collectionOf(db, row.collectionId)?.delete(row.id);
  }
  collectionOf(db, collectionId)?.delete(id);
}

/** Groups nothing links to any more are containers only; their skills stay in the library. */
export function deleteUnlinkedGroups(
  db: AppDb,
  candidates: Iterable<string>,
  stillLinked: ReadonlySet<string>,
) {
  for (const groupId of candidates) {
    if (!stillLinked.has(groupId)) deleteWithReferences(db, "resumeSkillGroup", groupId);
  }
}
