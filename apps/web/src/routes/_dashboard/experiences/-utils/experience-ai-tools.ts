import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import { deleteWithReferences } from "@/data-access-layer/event-sourced/rows/library-resolve";
import type { ResumeExperienceBullet } from "@/data-access-layer/event-sourced/schemas";
import {
  deleteExperienceBulletToolDefinition,
  listExperienceBulletsToolDefinition,
  listExperienceTitlesToolDefinition,
  moveExperienceBulletToolDefinition,
  setTitleBulletsToolDefinition,
  updateExperienceBulletToolDefinition,
} from "@/features/agentic-tools/definitions/experience-definitions";
import { norm } from "@/modules/library/library-keys";
import { newId, nowMs } from "@/routes/_dashboard/-utils/row-helpers";

/**
 * Context for the experience assistant's local tools, passed to `useChat({ context })`.
 * Tools never act outside the open company + period group.
 */
export type ExperienceToolContext = {
  db: AppDb;
  userId: string;
  /** Ids of the titles in the open group; read through a getter so mid-run edits stay visible. */
  getGroupTitleIds: () => string[];
};

type ClientToolCtx = { context: ExperienceToolContext };

function groupTitleIds(context: ExperienceToolContext) {
  return new Set(context.getGroupTitleIds());
}

function requireTitle(context: ExperienceToolContext, experienceId: string) {
  if (!groupTitleIds(context).has(experienceId)) {
    throw new Error(
      "That title is outside this company and period. Use list_experience_titles for ids in this conversation.",
    );
  }
  const row = context.db.collections.resumeExperience.get(experienceId);
  if (!row) throw new Error(`Unknown experience title "${experienceId}".`);
  return row;
}

function requireBullet(context: ExperienceToolContext, bulletId: string) {
  const bullet = context.db.collections.resumeExperienceBullet.get(bulletId);
  if (!bullet) throw new Error(`Unknown bullet "${bulletId}".`);
  requireTitle(context, bullet.experienceId);
  return bullet;
}

function bulletsOf(db: AppDb, experienceId: string): ResumeExperienceBullet[] {
  return db.collections.resumeExperienceBullet.toArray
    .filter((bullet) => bullet.experienceId === experienceId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function listExperienceTitles(context: ExperienceToolContext, _input: object) {
  const ids = groupTitleIds(context);
  const titles = context.db.collections.resumeExperience.toArray
    .filter((row) => ids.has(row.id))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt)
    .map((row) => ({
      id: row.id,
      role: row.role,
      startDate: row.startDate,
      endDate: row.endDate,
      location: row.location,
      bulletCount: bulletsOf(context.db, row.id).length,
    }));
  return { titles };
}

export function listExperienceBullets(
  context: ExperienceToolContext,
  input: { experienceId: string },
) {
  const title = requireTitle(context, input.experienceId);
  return {
    experienceId: title.id,
    role: title.role,
    bullets: bulletsOf(context.db, title.id).map((bullet) => ({
      id: bullet.id,
      text: bullet.text,
      sortOrder: bullet.sortOrder,
    })),
  };
}

export function updateExperienceBullet(
  context: ExperienceToolContext,
  input: { bulletId: string; text: string },
) {
  const bullet = requireBullet(context, input.bulletId);
  const text = input.text.trim();
  context.db.collections.resumeExperienceBullet.update(bullet.id, (row) => {
    row.text = text;
    row.searchableText = text;
    row.updatedAt = nowMs();
  });
  return { bulletId: bullet.id, text };
}

export function moveExperienceBullet(
  context: ExperienceToolContext,
  input: { bulletId: string; toExperienceId: string },
) {
  const bullet = requireBullet(context, input.bulletId);
  requireTitle(context, input.toExperienceId);
  const targetCount = bulletsOf(context.db, input.toExperienceId).length;
  context.db.collections.resumeExperienceBullet.update(bullet.id, (row) => {
    row.experienceId = input.toExperienceId;
    row.sortOrder = targetCount;
    row.updatedAt = nowMs();
  });
  return { bulletId: bullet.id, experienceId: input.toExperienceId };
}

export function deleteExperienceBullet(
  context: ExperienceToolContext,
  input: { bulletId: string },
) {
  const bullet = requireBullet(context, input.bulletId);
  deleteWithReferences(context.db, "resumeExperienceBullet", bullet.id);
  return { bulletId: bullet.id, deleted: true };
}

/**
 * Replaces a title's bullets: wording that already exists keeps its bullet id
 * (so resume layouts that point at it stay valid), the rest reuses leftover
 * slots before inserting, and unused rows are removed.
 */
export function setExperienceTitleBullets(
  context: ExperienceToolContext,
  input: { experienceId: string; texts: string[] },
) {
  const title = requireTitle(context, input.experienceId);
  const texts = input.texts.map((text) => text.trim()).filter(Boolean);
  const live = bulletsOf(context.db, title.id);

  // 1) Keep existing wording first, so unchanged bullets hold their ids.
  const idByIndex = new Map<number, string>();
  const claimed = new Set<string>();
  texts.forEach((text, index) => {
    const match = live.find(
      (bullet) => !claimed.has(bullet.id) && norm(bullet.text) === norm(text),
    );
    if (match) {
      claimed.add(match.id);
      idByIndex.set(index, match.id);
    }
  });

  // 2) Unmatched texts reuse the leftover slots in order, then new rows.
  const freeSlots = live.filter((bullet) => !claimed.has(bullet.id));
  const writes: Array<{ id: string; text: string; index: number }> = [];
  const inserts: Array<{ text: string; index: number }> = [];
  texts.forEach((text, index) => {
    const keptId = idByIndex.get(index);
    if (keptId !== undefined) {
      writes.push({ id: keptId, text, index });
      return;
    }
    const slot = freeSlots.find((bullet) => !claimed.has(bullet.id));
    if (slot) {
      claimed.add(slot.id);
      idByIndex.set(index, slot.id);
      writes.push({ id: slot.id, text, index });
      return;
    }
    inserts.push({ text, index });
  });

  const kept: string[] = Array.from({ length: texts.length });
  for (const write of writes) {
    kept[write.index] = write.id;
    context.db.collections.resumeExperienceBullet.update(write.id, (row) => {
      row.text = write.text;
      row.searchableText = write.text;
      row.sortOrder = write.index;
      row.updatedAt = nowMs();
    });
  }
  for (const insert of inserts) {
    const id = newId();
    const ts = nowMs();
    context.db.collections.resumeExperienceBullet.insert({
      id,
      experienceId: title.id,
      text: insert.text,
      sortOrder: insert.index,
      searchableText: insert.text,
      embedding: null,
      embeddingModel: null,
      createdAt: ts,
      updatedAt: ts,
    });
    kept[insert.index] = id;
  }

  for (const bullet of live) {
    if (!claimed.has(bullet.id)) {
      deleteWithReferences(context.db, "resumeExperienceBullet", bullet.id);
    }
  }

  return { experienceId: title.id, bulletIds: kept };
}

export const experienceAiClientTools = [
  listExperienceTitlesToolDefinition.client((input, ctx: ClientToolCtx) =>
    listExperienceTitles(ctx.context, input),
  ),
  listExperienceBulletsToolDefinition.client((input, ctx: ClientToolCtx) =>
    listExperienceBullets(ctx.context, input),
  ),
  updateExperienceBulletToolDefinition.client((input, ctx: ClientToolCtx) =>
    updateExperienceBullet(ctx.context, input),
  ),
  moveExperienceBulletToolDefinition.client((input, ctx: ClientToolCtx) =>
    moveExperienceBullet(ctx.context, input),
  ),
  deleteExperienceBulletToolDefinition.client((input, ctx: ClientToolCtx) =>
    deleteExperienceBullet(ctx.context, input),
  ),
  setTitleBulletsToolDefinition.client((input, ctx: ClientToolCtx) =>
    setExperienceTitleBullets(ctx.context, input),
  ),
];
