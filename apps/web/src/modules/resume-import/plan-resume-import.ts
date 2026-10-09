import type { AppDb } from "@/data-access-layer/event-sourced/collection";
import {
  addEducationBullets,
  resolveBulletIds,
} from "@/data-access-layer/event-sourced/library-resolve";
import { currentLayout } from "@/data-access-layer/event-sourced/resume-layout-rows";
import {
  defaultSectionTitle,
  layoutReferencedIds,
  type ResumeLayout,
} from "@/features/resume/resume-layout";
import type { ResumeDocumentV1, SectionKey } from "@/features/resume/resume-schema";
import { bulletKey, norm } from "@/modules/library/library-keys";
import { joinSearchable, nowMs } from "@/routes/_dashboard/-utils/row-helpers";
import {
  reconcileSection,
  type ImportAction,
  type ImportEntry,
  type ImportSection,
  type ReconcileContext,
} from "./reconcile";
import {
  contactSection,
  educationSection,
  experienceSection,
  linkSection,
  noteSection,
  projectSection,
  skillGroupSection,
  skillSection,
  summarySection,
  talkSection,
} from "./sections";

export interface ImportGroup {
  section: ImportSection;
  title: string;
  entries: ImportEntry[];
}

export interface ResumeImportPlan {
  resumeId: string;
  doc: ResumeDocumentV1;
  /** Display and commit order: an item that links to an earlier one always comes after it. */
  groups: ImportGroup[];
  experienceBullets: ReadonlyMap<string, string[]>;
  educationBullets: ReadonlyMap<string, string[]>;
  /** Skill group entry key → skill entry keys, in document order. */
  skillGroupMembers: ReadonlyMap<string, string[]>;
}

export type ImportChoices = ReadonlyMap<string, ImportAction>;

function sectionEnabled(doc: ResumeDocumentV1, key: SectionKey): boolean {
  switch (key) {
    case "header":
      return doc.header.enabled;
    case "summary":
      return doc.summary.enabled;
    case "experience":
      return doc.experience.enabled;
    case "education":
      return doc.education.enabled;
    case "projects":
      return doc.projects.enabled;
    case "talks":
      return doc.talks.enabled;
    case "skills":
      return doc.skills.enabled;
    case "notes":
      return doc.notes.enabled;
  }
}

function reconcileContext(db: AppDb, resumeId: string, userId: string): ReconcileContext {
  const usedElsewhere = new Map<string, number>();
  for (const resume of db.collections.resume.toArray) {
    if (resume.id === resumeId || !resume.layout) continue;
    if (resume.userId !== userId) continue;
    for (const id of layoutReferencedIds(resume.layout)) {
      usedElsewhere.set(id, (usedElsewhere.get(id) ?? 0) + 1);
    }
  }
  return {
    userId,
    onResume: layoutReferencedIds(currentLayout(db, resumeId)),
    usedElsewhere,
  };
}

function bulletDetail(db: AppDb, entry: ImportEntry, texts: string[]): string | null {
  if (texts.length === 0) return null;
  if (!entry.match) return `${texts.length} new bullet${texts.length === 1 ? "" : "s"}`;
  const experienceId = entry.match.id;
  const known = new Set(
    db.collections.resumeExperienceBullet.toArray
      .filter((bullet) => bullet.experienceId === experienceId)
      .map((bullet) => bulletKey(bullet)),
  );
  const reused = texts.filter((text) => known.has(bulletKey({ experienceId, text }))).length;
  const added = texts.length - reused;
  return `${texts.length} bullets: ${reused} already in your library, ${added} new`;
}

/**
 * Works out, section by section, which library rows a document maps onto
 * without writing anything. Pass the result to `applyResumeImport`, with any
 * per-entry overrides of the default action.
 */
export function planResumeImport(
  db: AppDb,
  target: { resumeId: string; userId: string },
  doc: ResumeDocumentV1,
): ResumeImportPlan {
  const context = reconcileContext(db, target.resumeId, target.userId);

  const contacts = reconcileSection(
    contactSection,
    db,
    context,
    [
      { type: "email", value: doc.header.email, label: "Email" },
      { type: "location", value: doc.header.location, label: "Location" },
    ].filter((contact) => contact.value.trim()),
  );
  const links = reconcileSection(
    linkSection,
    db,
    context,
    doc.header.links.filter((link) => link.url.trim()),
  );
  const summaries = reconcileSection(
    summarySection,
    db,
    context,
    doc.summary.text.trim() ? [{ text: doc.summary.text }] : [],
  );
  const notes = reconcileSection(
    noteSection,
    db,
    context,
    doc.notes.enabled && doc.notes.text.trim()
      ? [{ label: doc.notes.label.trim() || "Notes", text: doc.notes.text }]
      : [],
  );

  const experiences = reconcileSection(
    experienceSection,
    db,
    context,
    doc.experience.items.map((item) => ({
      company: item.company,
      role: item.role,
      startDate: item.start,
      endDate: item.end,
      location: item.location ?? "",
    })),
  );
  const experienceBullets = new Map<string, string[]>();
  experiences.forEach((entry, index) => {
    const texts = (doc.experience.items[index]?.bullets ?? []).filter((text) => text.trim());
    experienceBullets.set(entry.key, texts);
    const detail = bulletDetail(db, entry, texts);
    if (detail) entry.details.push(detail);
  });

  const education = reconcileSection(
    educationSection,
    db,
    context,
    doc.education.items.map((item) => ({
      school: item.school,
      degree: item.degree,
      field: item.field ?? "",
      startDate: "",
      endDate: item.year,
      description: "",
    })),
  );
  const educationBullets = new Map<string, string[]>();
  education.forEach((entry, index) => {
    const texts = (doc.education.items[index]?.bullets ?? []).filter((text) => text.trim());
    educationBullets.set(entry.key, texts);
    if (texts.length > 0) entry.details.push(`${texts.length} bullets (new wording is added)`);
  });

  const projects = reconcileSection(
    projectSection,
    db,
    context,
    doc.projects.items.map((item) => ({
      name: item.name,
      url: item.url,
      homepageUrl: item.homepageUrl ?? "",
      description: item.description,
      tech: JSON.stringify(item.tech),
    })),
  );
  const talks = reconcileSection(
    talkSection,
    db,
    context,
    doc.talks.items.map((item) => ({
      title: item.title,
      event: item.event,
      date: item.date,
      links: JSON.stringify(item.links),
    })),
  );

  const groupNames = doc.skills.groups.filter((group) => group.name.trim());
  const skillGroups = reconcileSection(
    skillGroupSection,
    db,
    context,
    groupNames.map((group) => ({ name: group.name })),
  );
  const skillNames: string[] = [];
  const skillIndexByName = new Map<string, number>();
  const membersByGroup = groupNames.map((group) =>
    group.items.flatMap((name) => {
      const key = norm(name);
      if (!key) return [];
      let index = skillIndexByName.get(key);
      if (index === undefined) {
        index = skillNames.length;
        skillNames.push(name);
        skillIndexByName.set(key, index);
      }
      return [index];
    }),
  );
  const skills = reconcileSection(
    skillSection,
    db,
    context,
    skillNames.map((name) => ({ name })),
  );
  const skillGroupMembers = new Map<string, string[]>();
  skillGroups.forEach((entry, index) => {
    const members = (membersByGroup[index] ?? []).flatMap((skillIndex) => {
      const skill = skills[skillIndex];
      return skill ? [skill.key] : [];
    });
    skillGroupMembers.set(entry.key, members);
    entry.details.push(`${members.length} skill${members.length === 1 ? "" : "s"}`);
  });

  const groups: ImportGroup[] = [
    { section: "contacts", title: "Contacts", entries: contacts },
    { section: "links", title: "Links", entries: links },
    { section: "summaries", title: "Summary", entries: summaries },
    { section: "experiences", title: "Experience", entries: experiences },
    { section: "education", title: "Education", entries: education },
    { section: "projects", title: "Projects", entries: projects },
    { section: "talks", title: "Talks", entries: talks },
    { section: "skillGroups", title: "Skill groups", entries: skillGroups },
    { section: "skills", title: "Skills", entries: skills },
    { section: "notes", title: "Notes", entries: notes },
  ];

  return {
    resumeId: target.resumeId,
    doc,
    groups: groups.filter((group) => group.entries.length > 0),
    experienceBullets,
    educationBullets,
    skillGroupMembers,
  };
}

export function chosenAction(entry: ImportEntry, choices: ImportChoices): ImportAction {
  const choice = choices.get(entry.key);
  return choice && entry.actions.includes(choice) ? choice : entry.defaultAction;
}

/** Writes the planned rows and points the résumé's layout at them, in one résumé update. */
export function applyResumeImport(
  db: AppDb,
  plan: ResumeImportPlan,
  choices: ImportChoices = new Map(),
) {
  const ids = new Map<string, string>();
  for (const group of plan.groups) {
    for (const entry of group.entries) {
      ids.set(entry.key, entry.commit(db, chosenAction(entry, choices)));
    }
  }

  const entriesOf = (section: ImportSection) =>
    plan.groups.find((group) => group.section === section)?.entries ?? [];
  const idsOf = (section: ImportSection) => [
    ...new Set(entriesOf(section).flatMap((entry) => ids.get(entry.key) ?? [])),
  ];

  const experiences: ResumeLayout["experiences"] = [];
  for (const entry of entriesOf("experiences")) {
    const id = ids.get(entry.key);
    if (!id || experiences.some((item) => item.id === id)) continue;
    const texts = plan.experienceBullets.get(entry.key) ?? [];
    experiences.push({ id, bullets: resolveBulletIds(db, id, texts) });
  }

  for (const entry of entriesOf("education")) {
    const id = ids.get(entry.key);
    if (id) addEducationBullets(db, id, plan.educationBullets.get(entry.key) ?? []);
  }

  const skillsByGroup = new Map<string, string[]>();
  for (const entry of entriesOf("skillGroups")) {
    const groupId = ids.get(entry.key);
    if (!groupId) continue;
    const skillIds = (plan.skillGroupMembers.get(entry.key) ?? []).flatMap(
      (key) => ids.get(key) ?? [],
    );
    const existing = skillsByGroup.get(groupId) ?? [];
    skillsByGroup.set(groupId, [...new Set([...existing, ...skillIds])]);
  }

  const { doc } = plan;
  const layout = currentLayout(db, plan.resumeId);
  const next: ResumeLayout = {
    ...layout,
    sections: doc.sectionOrder.map((key) => ({
      key,
      title:
        layout.sections.find((section) => section.key === key)?.title ?? defaultSectionTitle(key),
      enabled: sectionEnabled(doc, key),
    })),
    contacts: idsOf("contacts"),
    links: idsOf("links"),
    summaries: idsOf("summaries"),
    notes: idsOf("notes"),
    experiences,
    education: idsOf("education"),
    projects: idsOf("projects"),
    talks: idsOf("talks"),
    skillGroups: [...skillsByGroup].map(([id, skills]) => ({ id, skills })),
  };

  db.collections.resume.update(plan.resumeId, (draft) => {
    draft.fullName = doc.header.fullName;
    draft.headline = doc.header.headline;
    draft.templateId = doc.meta.templateId;
    draft.layout = next;
    draft.searchableText = joinSearchable(
      draft.name,
      doc.header.fullName,
      doc.header.headline,
      draft.description,
    );
    draft.updatedAt = nowMs();
  });
}

export interface ImportSummary {
  created: number;
  updated: number;
  reused: number;
  needsReview: number;
}

export function summarizeImport(plan: ResumeImportPlan, choices: ImportChoices): ImportSummary {
  const summary: ImportSummary = { created: 0, updated: 0, reused: 0, needsReview: 0 };
  for (const group of plan.groups) {
    for (const entry of group.entries) {
      const action = chosenAction(entry, choices);
      if (action === "create") summary.created++;
      else if (action === "update") summary.updated++;
      else summary.reused++;
      if (entry.actions.length > 1) summary.needsReview++;
    }
  }
  return summary;
}
