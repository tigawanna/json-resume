import { resumeLayoutSchema } from '@repo/isomorphic/resume/layout';
import type { DrizzleDB } from '../../database/database.module.js';
import { resume, resumeSkill } from '@repo/db/postgres/schema/resume';
import { desc, eq } from 'drizzle-orm';

export function collectSkillNames({
  resumes,
  skills,
}: {
  resumes: ReadonlyArray<{ layout: unknown }>;
  skills: ReadonlyArray<{ id: string; name: string }>;
}): Map<string, string[]> {
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

export async function skillNamesByGroup({
  db,
  userId,
}: {
  db: DrizzleDB;
  userId: string;
}): Promise<Map<string, string[]>> {
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
  return collectSkillNames({ resumes, skills });
}
