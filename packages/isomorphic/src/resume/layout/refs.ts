import { FLAT_LAYOUT_KEYS, type ResumeLayout } from "./schema.ts";
import { unique } from "./utils.ts";

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

function renamed(ids: ReadonlyArray<string>, from: string, to: string): string[] {
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
