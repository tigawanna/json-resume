import { z } from "zod";
import { SECTION_KEYS } from "./resume-schema";

/**
 * What a résumé shows from the library, and in what order. Array position is
 * the order everywhere — there are no sort numbers inside a layout.
 */
export const resumeLayoutSchema = z.object({
  sections: z
    .array(z.object({ key: z.string(), title: z.string(), enabled: z.boolean() }))
    .default([]),
  experiences: z
    .array(z.object({ id: z.string(), bullets: z.array(z.string()).default([]) }))
    .default([]),
  skillGroups: z
    .array(z.object({ id: z.string(), skills: z.array(z.string()).default([]) }))
    .default([]),
  education: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
  talks: z.array(z.string()).default([]),
  contacts: z.array(z.string()).default([]),
  links: z.array(z.string()).default([]),
  summaries: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  volunteers: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
});
export type ResumeLayout = z.infer<typeof resumeLayoutSchema>;
export type ResumeLayoutSection = ResumeLayout["sections"][number];

/** Every layout list that holds library ids (everything but `sections`). */
export type LayoutEntityKey = Exclude<keyof ResumeLayout, "sections">;
type FlatEntityKey = Exclude<LayoutEntityKey, "experiences" | "skillGroups">;

/** Layout lists that hold plain ids (no nested bullet / skill selection). */
export const FLAT_LAYOUT_KEYS = [
  "education",
  "projects",
  "talks",
  "contacts",
  "links",
  "summaries",
  "notes",
  "certifications",
  "volunteers",
  "languages",
] as const satisfies readonly FlatEntityKey[];

/** Every layout list that holds library ids, in a fixed order. */
export const LAYOUT_ENTITY_KEYS = [
  "experiences",
  "skillGroups",
  ...FLAT_LAYOUT_KEYS,
] as const satisfies readonly LayoutEntityKey[];

export function defaultSectionTitle(key: string) {
  return key === "header" ? "Profile" : key.charAt(0).toUpperCase() + key.slice(1);
}

export function emptyResumeLayout(): ResumeLayout {
  return {
    sections: SECTION_KEYS.map((key) => ({ key, title: defaultSectionTitle(key), enabled: true })),
    experiences: [],
    skillGroups: [],
    education: [],
    projects: [],
    talks: [],
    contacts: [],
    links: [],
    summaries: [],
    notes: [],
    certifications: [],
    volunteers: [],
    languages: [],
  };
}

function unique(ids: ReadonlyArray<string>) {
  return [...new Set(ids)];
}

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

/** Every library id the layout points at (lists, bullets and skills). */
export function layoutReferencedIds(layout: ResumeLayout): Set<string> {
  const ids = new Set<string>();
  for (const entry of layout.experiences) {
    ids.add(entry.id);
    for (const bullet of entry.bullets) ids.add(bullet);
  }
  for (const entry of layout.skillGroups) {
    ids.add(entry.id);
    for (const skill of entry.skills) ids.add(skill);
  }
  for (const key of FLAT_LAYOUT_KEYS) for (const id of layout[key]) ids.add(id);
  return ids;
}

/** Drops `id` from every list, bullet selection and skill selection. */
export function removeIdEverywhere(layout: ResumeLayout, id: string): ResumeLayout {
  const next: ResumeLayout = {
    ...layout,
    experiences: layout.experiences
      .filter((entry) => entry.id !== id)
      .map((entry) => ({ id: entry.id, bullets: entry.bullets.filter((bullet) => bullet !== id) })),
    skillGroups: layout.skillGroups
      .filter((entry) => entry.id !== id)
      .map((entry) => ({ id: entry.id, skills: entry.skills.filter((skill) => skill !== id) })),
  };
  for (const key of FLAT_LAYOUT_KEYS) next[key] = layout[key].filter((entry) => entry !== id);
  return next;
}

function renamed(ids: ReadonlyArray<string>, from: string, to: string) {
  return unique(ids.map((id) => (id === from ? to : id)));
}

/** Folds entries that share an id into the first one, merging their child ids. */
function mergeNested<T extends { id: string }>(
  entries: ReadonlyArray<T>,
  children: (entry: T) => string[],
  build: (id: string, childIds: string[]) => T,
): T[] {
  const order: string[] = [];
  const merged = new Map<string, string[]>();
  for (const entry of entries) {
    const existing = merged.get(entry.id);
    if (existing) {
      merged.set(entry.id, unique([...existing, ...children(entry)]));
    } else {
      order.push(entry.id);
      merged.set(entry.id, children(entry));
    }
  }
  return order.map((id) => build(id, merged.get(id) ?? []));
}

/**
 * Repoints `from` to `to` everywhere (a library merge). When both were in the
 * same list, `to` keeps the earlier position and the union of their bullets /
 * skills.
 */
export function replaceId(layout: ResumeLayout, from: string, to: string): ResumeLayout {
  if (from === to) return layout;
  const next: ResumeLayout = {
    ...layout,
    experiences: mergeNested(
      layout.experiences.map((entry) => ({
        id: entry.id === from ? to : entry.id,
        bullets: renamed(entry.bullets, from, to),
      })),
      (entry) => entry.bullets,
      (id, bullets) => ({ id, bullets }),
    ),
    skillGroups: mergeNested(
      layout.skillGroups.map((entry) => ({
        id: entry.id === from ? to : entry.id,
        skills: renamed(entry.skills, from, to),
      })),
      (entry) => entry.skills,
      (id, skills) => ({ id, skills }),
    ),
  };
  for (const key of FLAT_LAYOUT_KEYS) next[key] = renamed(layout[key], from, to);
  return next;
}
