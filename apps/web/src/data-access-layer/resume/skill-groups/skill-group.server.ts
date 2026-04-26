import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeSkill, resumeSkillGroup } from "@/lib/drizzle/scheam";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE, type PaginatedResult } from "../../pagination.types";
import type { SkillGroupListItemDTO } from "./skill-group.types";

export async function listSkillGroupsForUser(
  userId: string,
  keyword?: string,
): Promise<SkillGroupListItemDTO[]> {
  const conditions = [eq(resume.userId, userId)];
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(or(like(resumeSkillGroup.name, pattern))!);
  }

  const groups = await db
    .select({
      id: resumeSkillGroup.id,
      resumeId: resumeSkillGroup.resumeId,
      resumeName: resume.name,
      name: resumeSkillGroup.name,
      sortOrder: resumeSkillGroup.sortOrder,
      createdAt: resumeSkillGroup.createdAt,
      updatedAt: resumeSkillGroup.updatedAt,
    })
    .from(resumeSkillGroup)
    .innerJoin(resume, eq(resumeSkillGroup.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(desc(resumeSkillGroup.updatedAt));

  const result: SkillGroupListItemDTO[] = [];
  for (const g of groups) {
    const skills = await db
      .select({ name: resumeSkill.name })
      .from(resumeSkill)
      .where(eq(resumeSkill.groupId, g.id))
      .orderBy(asc(resumeSkill.sortOrder));
    result.push({
      ...g,
      skills: JSON.stringify(skills.map((s) => s.name)),
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    });
  }
  return result;
}

export async function listSkillGroupsForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<SkillGroupListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resume.userId, userId)];

  if (opts?.keyword) {
    const pattern = `%${opts.keyword}%`;
    conditions.push(or(like(resumeSkillGroup.name, pattern))!);
  }

  if (opts?.cursor) {
    conditions.push(
      direction === "before"
        ? lt(resumeSkillGroup.id, opts.cursor)
        : gt(resumeSkillGroup.id, opts.cursor),
    );
  }

  const groups = await db
    .select({
      id: resumeSkillGroup.id,
      resumeId: resumeSkillGroup.resumeId,
      resumeName: resume.name,
      name: resumeSkillGroup.name,
      sortOrder: resumeSkillGroup.sortOrder,
      createdAt: resumeSkillGroup.createdAt,
      updatedAt: resumeSkillGroup.updatedAt,
    })
    .from(resumeSkillGroup)
    .innerJoin(resume, eq(resumeSkillGroup.resumeId, resume.id))
    .where(and(...conditions))
    .orderBy(direction === "before" ? desc(resumeSkillGroup.id) : asc(resumeSkillGroup.id))
    .limit(DEFAULT_PAGE_SIZE + 1);

  const hasMore = groups.length > DEFAULT_PAGE_SIZE;
  const orderedGroups =
    direction === "before"
      ? groups.slice(0, DEFAULT_PAGE_SIZE).reverse()
      : groups.slice(0, DEFAULT_PAGE_SIZE);

  const items: SkillGroupListItemDTO[] = [];
  for (const g of orderedGroups) {
    const skills = await db
      .select({ name: resumeSkill.name })
      .from(resumeSkill)
      .where(eq(resumeSkill.groupId, g.id))
      .orderBy(asc(resumeSkill.sortOrder));
    items.push({
      ...g,
      skills: JSON.stringify(skills.map((s) => s.name)),
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    });
  }

  let nextCursor: string | undefined;
  let previousCursor: string | undefined;

  if (direction === "after") {
    nextCursor = hasMore ? items[items.length - 1].id : undefined;
    previousCursor = opts?.cursor !== undefined ? items[0]?.id : undefined;
  } else {
    previousCursor = hasMore ? items[0]?.id : undefined;
    nextCursor = items.length > 0 ? items[items.length - 1].id : undefined;
  }

  return { items, nextCursor, previousCursor };
}

export async function deleteSkillGroupForUser(groupId: string, userId: string): Promise<void> {
  const row = await db
    .select({ id: resumeSkillGroup.id })
    .from(resumeSkillGroup)
    .innerJoin(resume, eq(resumeSkillGroup.resumeId, resume.id))
    .where(and(eq(resumeSkillGroup.id, groupId), eq(resume.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Skill group not found");
  await db.delete(resumeSkillGroup).where(eq(resumeSkillGroup.id, groupId));
}
