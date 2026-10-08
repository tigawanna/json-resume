import {
  emptyResumeLayout,
  replaceId,
  type LayoutEntityKey,
  type ResumeLayout,
} from "@/features/resume/resume-layout";
import { norm } from "@/modules/library/library-keys";

/** One link row: résumé → library entity at a position. */
export type LegacyLink = { resumeId: string; entityId: string; sortOrder: number };

/** Everything the old link tables said about résumés, read once from the database. */
export type LegacyLinkData = {
  resumes: ReadonlyArray<{ id: string; userId: string; layout: ResumeLayout | null }>;
  sections: ReadonlyArray<{
    resumeId: string;
    key: string;
    title: string;
    enabled: boolean;
    sortOrder: number;
  }>;
  links: ReadonlyMap<LayoutEntityKey, ReadonlyArray<LegacyLink>>;
  /** Library ids that still exist, per layout list; links to anything else are dropped. */
  existing: ReadonlyMap<LayoutEntityKey, ReadonlySet<string>>;
  bullets: ReadonlyArray<{ id: string; experienceId: string; sortOrder: number }>;
  bulletLinks: ReadonlyArray<LegacyLink>;
  skills: ReadonlyArray<{ id: string; groupId: string | null; sortOrder: number }>;
  groupSkills: ReadonlyArray<{ groupId: string; skillId: string; sortOrder: number }>;
  groups: ReadonlyArray<{ id: string; userId: string | null; name: string; updatedAt: number }>;
};

function bySortOrder(a: { sortOrder: number }, b: { sortOrder: number }) {
  return a.sortOrder - b.sortOrder;
}

function linkedIds(resumeId: string, data: LegacyLinkData, key: LayoutEntityKey): string[] {
  const exists = data.existing.get(key) ?? new Set<string>();
  const ids = (data.links.get(key) ?? [])
    .filter((link) => link.resumeId === resumeId)
    .slice()
    .sort(bySortOrder)
    .map((link) => link.entityId)
    .filter((id) => exists.has(id));
  return [...new Set(ids)];
}

/** An experience none of whose bullets is linked anywhere predates bullet links: all of them show. */
function bulletIds(resumeId: string, experienceId: string, data: LegacyLinkData): string[] {
  const own = data.bullets.filter((bullet) => bullet.experienceId === experienceId);
  const ownIds = new Set(own.map((bullet) => bullet.id));
  const links = data.bulletLinks.filter((link) => ownIds.has(link.entityId));
  if (links.length === 0)
    return own
      .slice()
      .sort(bySortOrder)
      .map((bullet) => bullet.id);
  return links
    .filter((link) => link.resumeId === resumeId)
    .slice()
    .sort(bySortOrder)
    .map((link) => link.entityId);
}

/** A group's skills in link order; groups without skill links use the skills' legacy `groupId`. */
function skillIds(groupId: string, data: LegacyLinkData): string[] {
  const known = new Set(data.skills.map((skill) => skill.id));
  const links = data.groupSkills.filter((link) => link.groupId === groupId);
  if (links.length === 0) {
    return data.skills
      .filter((skill) => skill.groupId === groupId)
      .slice()
      .sort(bySortOrder)
      .map((skill) => skill.id);
  }
  return links
    .slice()
    .sort(bySortOrder)
    .map((link) => link.skillId)
    .filter((id) => known.has(id));
}

/** The layout the old link rows describe, with the same legacy rules the editor used. */
export function layoutFromLegacyLinks(resumeId: string, data: LegacyLinkData): ResumeLayout {
  const sections = data.sections
    .filter((section) => section.resumeId === resumeId)
    .slice()
    .sort(bySortOrder)
    .map((section) => ({ key: section.key, title: section.title, enabled: section.enabled }));

  return {
    sections: sections.length > 0 ? sections : emptyResumeLayout().sections,
    experiences: linkedIds(resumeId, data, "experiences").map((id) => ({
      id,
      bullets: bulletIds(resumeId, id, data),
    })),
    skillGroups: linkedIds(resumeId, data, "skillGroups").map((id) => ({
      id,
      skills: skillIds(id, data),
    })),
    education: linkedIds(resumeId, data, "education"),
    projects: linkedIds(resumeId, data, "projects"),
    talks: linkedIds(resumeId, data, "talks"),
    contacts: linkedIds(resumeId, data, "contacts"),
    links: linkedIds(resumeId, data, "links"),
    summaries: linkedIds(resumeId, data, "summaries"),
    notes: linkedIds(resumeId, data, "notes"),
    certifications: linkedIds(resumeId, data, "certifications"),
    volunteers: linkedIds(resumeId, data, "volunteers"),
    languages: linkedIds(resumeId, data, "languages"),
  };
}

export type LayoutMigrationPlan = {
  /** Final layout for every résumé. */
  layouts: Map<string, ResumeLayout>;
  /** Résumés whose layout came from link rows (the rest already had one). */
  derived: string[];
  /** Skill groups folded into another group of the same name and owner. */
  groupMerges: Array<{ from: string; to: string }>;
};

/**
 * Gives every résumé a stored layout and merges skill groups by name per
 * owner (the most recently updated group survives). Layouts are repointed to
 * the survivor, so a résumé that showed two same-named groups now shows one
 * with the union of their skills.
 */
export function planLayoutMigration(data: LegacyLinkData): LayoutMigrationPlan {
  const layouts = new Map<string, ResumeLayout>();
  const derived: string[] = [];
  for (const resume of data.resumes) {
    if (resume.layout) {
      layouts.set(resume.id, resume.layout);
    } else {
      layouts.set(resume.id, layoutFromLegacyLinks(resume.id, data));
      derived.push(resume.id);
    }
  }

  const byName = new Map<string, LegacyLinkData["groups"][number][]>();
  for (const group of data.groups) {
    const name = norm(group.name);
    if (!name || group.userId == null) continue;
    const key = `${group.userId}\u241f${name}`;
    const list = byName.get(key);
    if (list) list.push(group);
    else byName.set(key, [group]);
  }

  const groupMerges: LayoutMigrationPlan["groupMerges"] = [];
  for (const groups of byName.values()) {
    if (groups.length < 2) continue;
    const survivor = groups.reduce((best, group) =>
      group.updatedAt > best.updatedAt ? group : best,
    );
    for (const group of groups) {
      if (group.id === survivor.id) continue;
      groupMerges.push({ from: group.id, to: survivor.id });
      for (const resume of data.resumes) {
        if (resume.userId !== survivor.userId) continue;
        const layout = layouts.get(resume.id);
        if (layout) layouts.set(resume.id, replaceId(layout, group.id, survivor.id));
      }
    }
  }

  return { layouts, derived, groupMerges };
}
