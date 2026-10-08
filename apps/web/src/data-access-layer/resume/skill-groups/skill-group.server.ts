import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { resume, resumeSkill, resumeSkillGroup } from "@/lib/drizzle/scheam";
import { resumeLayoutSchema } from "@/features/resume/resume-layout";
import { and, asc, desc, eq, gt, like, lt, or } from "drizzle-orm";
import { DEFAULT_PAGE_SIZE, type PaginatedResult } from "../../pagination.types";
import type { SkillGroupListItemDTO } from "./skill-group.types";

/** Skill names picked under each group across the user's résumé layouts, first use first. */
async function skillNamesByGroup(userId: string): Promise<Map<string, string[]>> {
  const [resumes, skills] = await Promise.all([
    db
      .select({ layout: resume.layout })
      .from(resume)
      .where(eq(resume.userId, userId))
      .orderBy(desc(resume.updatedAt)),
    db
      .select({ id: resumeSkill.id, name: resumeSkill.name })
      .from(resumeSkill)
      .where(eq(resumeSkill.userId, userId)),
  ]);
  const skillNames = new Map(skills.map((skill) => [skill.id, skill.name]));
  const skillIdsByGroup = new Map<string, Set<string>>();
  for (const row of resumes) {
    const parsed = resumeLayoutSchema.safeParse(row.layout);
    if (!parsed.success) continue;
    for (const entry of parsed.data.skillGroups) {
      const ids = skillIdsByGroup.get(entry.id) ?? new Set<string>();
      for (const skillId of entry.skills) ids.add(skillId);
      skillIdsByGroup.set(entry.id, ids);
    }
  }
  const result = new Map<string, string[]>();
  for (const [groupId, ids] of skillIdsByGroup) {
    result.set(
      groupId,
      [...ids].flatMap((id) => {
        const name = skillNames.get(id);
        return name === undefined ? [] : [name];
      }),
    );
  }
  return result;
}

export async function listSkillGroupsForUser(
  userId: string,
  keyword?: string,
): Promise<SkillGroupListItemDTO[]> {
  const conditions = [eq(resumeSkillGroup.userId, userId)];
  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(or(like(resumeSkillGroup.name, pattern))!);
  }

  const groups = await db
    .select({
      id: resumeSkillGroup.id,
      name: resumeSkillGroup.name,
      sortOrder: resumeSkillGroup.sortOrder,
      createdAt: resumeSkillGroup.createdAt,
      updatedAt: resumeSkillGroup.updatedAt,
    })
    .from(resumeSkillGroup)
    .where(and(...conditions))
    .orderBy(desc(resumeSkillGroup.updatedAt));

  const namesByGroup = await skillNamesByGroup(userId);
  return groups.map((g) => ({
    ...g,
    skills: JSON.stringify(namesByGroup.get(g.id) ?? []),
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }));
}

export async function listSkillGroupsForUserPaginated(
  userId: string,
  opts?: { keyword?: string; cursor?: string; direction?: "after" | "before" },
): Promise<PaginatedResult<SkillGroupListItemDTO>> {
  const direction = opts?.direction ?? "after";
  const conditions = [eq(resumeSkillGroup.userId, userId)];

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
      name: resumeSkillGroup.name,
      sortOrder: resumeSkillGroup.sortOrder,
      createdAt: resumeSkillGroup.createdAt,
      updatedAt: resumeSkillGroup.updatedAt,
    })
    .from(resumeSkillGroup)
    .where(and(...conditions))
    .orderBy(direction === "before" ? desc(resumeSkillGroup.id) : asc(resumeSkillGroup.id))
    .limit(DEFAULT_PAGE_SIZE + 1);

  const hasMore = groups.length > DEFAULT_PAGE_SIZE;
  const orderedGroups =
    direction === "before"
      ? groups.slice(0, DEFAULT_PAGE_SIZE).reverse()
      : groups.slice(0, DEFAULT_PAGE_SIZE);

  const namesByGroup = await skillNamesByGroup(userId);
  const items: SkillGroupListItemDTO[] = orderedGroups.map((g) => ({
    ...g,
    skills: JSON.stringify(namesByGroup.get(g.id) ?? []),
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }));

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
    .where(and(eq(resumeSkillGroup.id, groupId), eq(resumeSkillGroup.userId, userId)))
    .limit(1);
  if (row.length === 0) throw new Error("Skill group not found");
  await db.delete(resumeSkillGroup).where(eq(resumeSkillGroup.id, groupId));
}
