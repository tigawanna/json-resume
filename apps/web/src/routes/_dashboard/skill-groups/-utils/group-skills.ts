import type { Resume, ResumeSkill } from "@/data-access-layer/event-sourced/schemas";

/** Every skill any résumé layout picks under the group, first use first. */
export function skillsUsedUnderGroup(
  groupId: string,
  resumes: ReadonlyArray<Pick<Resume, "layout">>,
  skills: ReadonlyArray<ResumeSkill>,
): ResumeSkill[] {
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  const ids = new Set<string>();
  for (const resume of resumes) {
    const entry = resume.layout?.skillGroups.find((group) => group.id === groupId);
    for (const id of entry?.skills ?? []) ids.add(id);
  }
  return [...ids].flatMap((id) => {
    const skill = byId.get(id);
    return skill ? [skill] : [];
  });
}
