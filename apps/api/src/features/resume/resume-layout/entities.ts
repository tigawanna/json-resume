import type { LayoutEntityKey, ResumeLayout } from "./schema";
import { unique } from "./utils";

export function layoutIds(layout: ResumeLayout, key: LayoutEntityKey): string[] {
  if (key === "experiences") return layout.experiences.map((entry) => entry.id);
  if (key === "skillGroups") return layout.skillGroups.map((entry) => entry.id);
  return layout[key];
}

/**
 * Replaces one list with `ids` (duplicates dropped). Experiences and skill
 * groups that stay keep their chosen bullets / skills; new ones start empty.
 */
export function setEntities(
  layout: ResumeLayout,
  key: LayoutEntityKey,
  ids: ReadonlyArray<string>,
): ResumeLayout {
  const next = unique(ids);
  if (key === "experiences") {
    const bullets = new Map(layout.experiences.map((entry) => [entry.id, entry.bullets]));
    return {
      ...layout,
      experiences: next.map((id) => ({ id, bullets: bullets.get(id) ?? [] })),
    };
  }
  if (key === "skillGroups") {
    const skills = new Map(layout.skillGroups.map((entry) => [entry.id, entry.skills]));
    return {
      ...layout,
      skillGroups: next.map((id) => ({ id, skills: skills.get(id) ?? [] })),
    };
  }
  return { ...layout, [key]: next };
}

/** Appends `id` to a list; a no-op when it is already there. */
export function addEntity(layout: ResumeLayout, key: LayoutEntityKey, id: string): ResumeLayout {
  return setEntities(layout, key, [...layoutIds(layout, key), id]);
}

export function removeEntity(layout: ResumeLayout, key: LayoutEntityKey, id: string): ResumeLayout {
  return setEntities(
    layout,
    key,
    layoutIds(layout, key).filter((entry) => entry !== id),
  );
}

/** Swaps two ids in one list; a no-op unless both are in it. */
export function swapEntities(
  layout: ResumeLayout,
  key: LayoutEntityKey,
  idA: string,
  idB: string,
): ResumeLayout {
  const ids = layoutIds(layout, key);
  const i = ids.indexOf(idA);
  const j = ids.indexOf(idB);
  if (i === -1 || j === -1) return layout;
  const next = [...ids];
  next[i] = idB;
  next[j] = idA;
  return setEntities(layout, key, next);
}

/** Sets an experience's bullets, adding the experience when it is missing. */
export function setExperienceBullets(
  layout: ResumeLayout,
  experienceId: string,
  bulletIds: ReadonlyArray<string>,
): ResumeLayout {
  const withExperience = addEntity(layout, "experiences", experienceId);
  return {
    ...withExperience,
    experiences: withExperience.experiences.map((entry) =>
      entry.id === experienceId ? { id: entry.id, bullets: unique(bulletIds) } : entry,
    ),
  };
}

/** Sets a skill group's skills, adding the group when it is missing. */
export function setGroupSkills(
  layout: ResumeLayout,
  groupId: string,
  skillIds: ReadonlyArray<string>,
): ResumeLayout {
  const withGroup = addEntity(layout, "skillGroups", groupId);
  return {
    ...withGroup,
    skillGroups: withGroup.skillGroups.map((entry) =>
      entry.id === groupId ? { id: entry.id, skills: unique(skillIds) } : entry,
    ),
  };
}
