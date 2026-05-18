import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import {
  resume,
  resumeExperience,
  resumeExperienceBullet,
  resumeExperienceItem,
} from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, gt, inArray, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE } from "../../pagination.types";
import type { PaginatedResult } from "../../pagination.types";
import type { ExperienceListItemDTO } from "./experience.types";

function encodeExperienceCursor(sortOrder: number, id: string): string {
  return `${sortOrder}:${id}`;
}

function parseExperienceCursor(
  cursor: string | undefined,
): { sortOrder: number; id: string } | undefined {
  if (!cursor) return undefined;
  const i = cursor.indexOf(":");
  if (i < 0) return undefined;
  const sortOrder = Number(cursor.slice(0, i));
  const id = cursor.slice(i + 1);
  if (!Number.isFinite(sortOrder) || id.length === 0) return undefined;
  return { sortOrder, id };
}

type ExperienceBaseRow = Omit<ExperienceListItemDTO, "bullets" | "resumeUsage">;

async function enrichExperienceListItems(
  userId: string,
  items: ExperienceBaseRow[],
): Promise<ExperienceListItemDTO[]> {
  if (items.length === 0) return [];

  const experienceIds = items.map((item) => item.id);

  const bulletRows = await db
    .select({
      id: resumeExperienceBullet.id,
      experienceId: resumeExperienceBullet.experienceId,
      text: resumeExperienceBullet.text,
      sortOrder: resumeExperienceBullet.sortOrder,
    })
    .from(resumeExperienceBullet)
    .where(inArray(resumeExperienceBullet.experienceId, experienceIds))
    .orderBy(asc(resumeExperienceBullet.sortOrder), asc(resumeExperienceBullet.id));

  const resumeUsageRows = await db
    .select({
      experienceId: resumeExperienceItem.experienceId,
      resumeId: resumeExperienceItem.resumeId,
      resumeName: resume.name,
      sortOrder: resumeExperienceItem.sortOrder,
    })
    .from(resumeExperienceItem)
    .innerJoin(resume, eq(resumeExperienceItem.resumeId, resume.id))
    .where(
      and(inArray(resumeExperienceItem.experienceId, experienceIds), eq(resume.userId, userId)),
    )
    .orderBy(asc(resumeExperienceItem.sortOrder), asc(resume.name));

  const bulletsByExperienceId = new Map<string, ExperienceListItemDTO["bullets"]>();
  for (const bullet of bulletRows) {
    const current = bulletsByExperienceId.get(bullet.experienceId) ?? [];
    current.push({
      id: bullet.id,
      text: bullet.text,
      sortOrder: bullet.sortOrder,
    });
    bulletsByExperienceId.set(bullet.experienceId, current);
  }

  const resumeUsageByExperienceId = new Map<string, ExperienceListItemDTO["resumeUsage"]>();
  for (const usage of resumeUsageRows) {
    const current = resumeUsageByExperienceId.get(usage.experienceId) ?? [];
    current.push({
      resumeId: usage.resumeId,
      resumeName: usage.resumeName,
      sortOrder: usage.sortOrder,
    });
    resumeUsageByExperienceId.set(usage.experienceId, current);
  }

  return items.map((item) => ({
    ...item,
    bullets: bulletsByExperienceId.get(item.id) ?? [],
    resumeUsage: resumeUsageByExperienceId.get(item.id) ?? [],
  }));
}

export async function listExperiencesForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<ExperienceListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resumeExperience.userId, userId)];

  if (opts?.keyword) {
    const pattern = `%${opts.keyword}%`;
    conditions.push(
      or(
        like(resumeExperience.company, pattern),
        like(resumeExperience.role, pattern),
        like(resumeExperience.location, pattern),
      )!,
    );
  }

  const cursorKey = parseExperienceCursor(opts?.cursor);
  if (cursorKey) {
    if (direction === "before") {
      conditions.push(
        or(
          gt(resumeExperience.sortOrder, cursorKey.sortOrder),
          and(
            eq(resumeExperience.sortOrder, cursorKey.sortOrder),
            gt(resumeExperience.id, cursorKey.id),
          ),
        )!,
      );
    } else {
      conditions.push(
        or(
          lt(resumeExperience.sortOrder, cursorKey.sortOrder),
          and(
            eq(resumeExperience.sortOrder, cursorKey.sortOrder),
            lt(resumeExperience.id, cursorKey.id),
          ),
        )!,
      );
    }
  }

  const rows = await db
    .select({
      id: resumeExperience.id,
      company: resumeExperience.company,
      role: resumeExperience.role,
      startDate: resumeExperience.startDate,
      endDate: resumeExperience.endDate,
      location: resumeExperience.location,
      sortOrder: resumeExperience.sortOrder,
      createdAt: resumeExperience.createdAt,
      updatedAt: resumeExperience.updatedAt,
    })
    .from(resumeExperience)
    .where(and(...conditions))
    .orderBy(
      ...(direction === "before"
        ? [asc(resumeExperience.sortOrder), asc(resumeExperience.id)]
        : [desc(resumeExperience.sortOrder), desc(resumeExperience.id)]),
    )
    .limit(DEFAULT_PAGE_SIZE + 1);

  const hasMore = rows.length > DEFAULT_PAGE_SIZE;
  const orderedRows =
    direction === "before"
      ? rows.slice(0, DEFAULT_PAGE_SIZE).reverse()
      : rows.slice(0, DEFAULT_PAGE_SIZE);

  const baseItems = orderedRows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
  const items = await enrichExperienceListItems(userId, baseItems);

  let nextCursor: string | undefined;
  let previousCursor: string | undefined;

  if (direction === "after") {
    nextCursor = hasMore
      ? encodeExperienceCursor(items[items.length - 1].sortOrder, items[items.length - 1].id)
      : undefined;
    previousCursor =
      opts?.cursor !== undefined && items.length > 0
        ? encodeExperienceCursor(items[0].sortOrder, items[0].id)
        : undefined;
  } else {
    previousCursor =
      hasMore && items.length > 0
        ? encodeExperienceCursor(items[0].sortOrder, items[0].id)
        : undefined;
    nextCursor =
      items.length > 0
        ? encodeExperienceCursor(items[items.length - 1].sortOrder, items[items.length - 1].id)
        : undefined;
  }

  return { items, nextCursor, previousCursor };
}

export async function listExperiencesForUser(
  userId: string,
  keyword?: string,
): Promise<ExperienceListItemDTO[]> {
  const conditions = [eq(resumeExperience.userId, userId)];
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      or(
        like(resumeExperience.company, pattern),
        like(resumeExperience.role, pattern),
        like(resumeExperience.location, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      id: resumeExperience.id,
      company: resumeExperience.company,
      role: resumeExperience.role,
      startDate: resumeExperience.startDate,
      endDate: resumeExperience.endDate,
      location: resumeExperience.location,
      sortOrder: resumeExperience.sortOrder,
      createdAt: resumeExperience.createdAt,
      updatedAt: resumeExperience.updatedAt,
    })
    .from(resumeExperience)
    .where(and(...conditions))
    .orderBy(desc(resumeExperience.sortOrder), desc(resumeExperience.id));

  const baseItems = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return enrichExperienceListItems(userId, baseItems);
}

export async function deleteExperienceForUser(experienceId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeExperience.id })
    .from(resumeExperience)
    .where(and(eq(resumeExperience.id, experienceId), eq(resumeExperience.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Experience not found");
  await db.delete(resumeExperience).where(eq(resumeExperience.id, experienceId));
}

export async function swapExperienceSortOrder(
  userId: string,
  idA: string,
  idB: string,
): Promise<void> {
  const rows = await db
    .select({ id: resumeExperience.id, sortOrder: resumeExperience.sortOrder })
    .from(resumeExperience)
    .where(
      and(
        eq(resumeExperience.userId, userId),
        or(eq(resumeExperience.id, idA), eq(resumeExperience.id, idB)),
      ),
    )
    .limit(2);

  if (rows.length !== 2) throw new Error("One or both experiences not found");

  const [first, second] = rows as [
    { id: string; sortOrder: number },
    { id: string; sortOrder: number },
  ];

  await db
    .update(resumeExperience)
    .set({ sortOrder: second.sortOrder })
    .where(eq(resumeExperience.id, first.id));

  await db
    .update(resumeExperience)
    .set({ sortOrder: first.sortOrder })
    .where(eq(resumeExperience.id, second.id));
}
