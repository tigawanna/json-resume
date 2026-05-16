import {
  SECTION_KEYS,
  type ResumeDocumentV1,
  type SectionKey,
} from "@/features/resume/resume-schema";
import type { ResumeDetailDTO } from "./resume.types";

/** Convert a fully-loaded normalized ResumeDetailDTO into the flat ResumeDocumentV1 used for rendering, PDF, and LLM prompts. */
export function resumeDetailToDocument(detail: ResumeDetailDTO): ResumeDocumentV1 {
  const sectionOrder = detail.sections
    .filter((s) => SECTION_KEYS.includes(s.key as SectionKey))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => s.key as SectionKey);

  // Fill in any missing section keys
  for (const key of SECTION_KEYS) {
    if (!sectionOrder.includes(key)) {
      sectionOrder.push(key);
    }
  }

  const sectionEnabled = (key: string): boolean => {
    const s = detail.sections.find((sec) => sec.key === key);
    return s?.enabled ?? true;
  };

  const emailContact = detail.contacts.find((c) => c.type === "email");
  const locationContact = detail.contacts.find((c) => c.type === "location");

  return {
    version: 1,
    meta: { templateId: detail.templateId },
    sectionOrder,
    header: {
      enabled: sectionEnabled("header"),
      fullName: detail.fullName,
      headline: detail.headline,
      email: emailContact?.value ?? "",
      location: locationContact?.value ?? "",
      links: detail.links
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((l) => ({ label: l.label, url: l.url })),
    },
    summary: {
      enabled: sectionEnabled("summary"),
      text: detail.summaries.sort((a, b) => a.sortOrder - b.sortOrder)[0]?.text ?? "",
    },
    experience: {
      enabled: sectionEnabled("experience"),
      items: detail.experiences
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((ex) => ({
          company: ex.company,
          role: ex.role,
          start: ex.startDate,
          end: ex.endDate,
          location: ex.location || undefined,
          bullets: ex.bullets.sort((a, b) => a.sortOrder - b.sortOrder).map((b) => b.text),
        })),
    },
    education: {
      enabled: sectionEnabled("education"),
      items: detail.education
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((ed) => ({
          school: ed.school,
          degree: ed.degree,
          field: ed.field || undefined,
          year: ed.endDate || ed.startDate,
          bullets:
            ed.bullets.length > 0
              ? ed.bullets.sort((a, b) => a.sortOrder - b.sortOrder).map((b) => b.text)
              : undefined,
        })),
    },
    projects: {
      enabled: sectionEnabled("projects"),
      items: detail.projects
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => ({
          name: p.name,
          url: p.url,
          homepageUrl: p.homepageUrl || undefined,
          description: p.description,
          tech: safeParseTech(p.tech),
        })),
    },
    talks: {
      enabled: sectionEnabled("talks"),
      items: detail.talks
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((t) => ({
          title: t.title,
          event: t.event,
          date: t.date,
          links: safeParseLinks(t.links),
        })),
    },
    skills: {
      enabled: sectionEnabled("skills"),
      groups: detail.skillGroups
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((g) => ({
          name: g.name,
          items: g.skills.sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.name),
        })),
    },
  };
}

function safeParseTech(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function safeParseLinks(raw: string): { label: string; url: string }[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is { label: string; url: string } =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as Record<string, unknown>).label === "string" &&
        typeof (x as Record<string, unknown>).url === "string",
    );
  } catch {
    return [];
  }
}

/** Data structure for creating/importing a full resume from a ResumeDocumentV1 */
export interface ResumeImportData {
  name: string;
  description: string;
  jobDescription: string;
  doc: ResumeDocumentV1;
}

/**
 * Convert a ResumeDocumentV1 into the insert-ready rows for all tables.
 * Each row gets a fresh UUID. Returns arrays ready for batch insert.
 */
export function documentToInsertData(resumeId: string, userId: string, doc: ResumeDocumentV1) {
  const sectionEnabled = (key: SectionKey): boolean => {
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
      default:
        return true;
    }
  };

  const sections = doc.sectionOrder.map((key, i) => ({
    id: crypto.randomUUID(),
    resumeId,
    key,
    title: key === "header" ? "Profile" : key.charAt(0).toUpperCase() + key.slice(1),
    enabled: sectionEnabled(key),
    sortOrder: i,
  }));

  const contacts: {
    id: string;
    userId: string;
    type: string;
    value: string;
    label: string;
    sortOrder: number;
  }[] = [];
  const contactItems: { resumeId: string; contactId: string; sortOrder: number }[] = [];
  if (doc.header.email) {
    const id = crypto.randomUUID();
    contacts.push({
      id,
      userId,
      type: "email",
      value: doc.header.email,
      label: "Email",
      sortOrder: 0,
    });
    contactItems.push({ resumeId, contactId: id, sortOrder: 0 });
  }
  if (doc.header.location) {
    const id = crypto.randomUUID();
    contacts.push({
      id,
      userId,
      type: "location",
      value: doc.header.location,
      label: "Location",
      sortOrder: 1,
    });
    contactItems.push({ resumeId, contactId: id, sortOrder: 1 });
  }

  const links: {
    id: string;
    userId: string;
    label: string;
    url: string;
    icon: string | null;
    sortOrder: number;
  }[] = doc.header.links.map((l, i) => {
    const id = crypto.randomUUID();
    return {
      id,
      userId,
      label: l.label,
      url: l.url,
      icon: null,
      sortOrder: i,
    };
  });
  const linkItems = links.map((l) => ({ resumeId, linkId: l.id, sortOrder: l.sortOrder }));

  const summaries: {
    id: string;
    userId: string;
    text: string;
    sortOrder: number;
  }[] = doc.summary.text.trim()
    ? [{ id: crypto.randomUUID(), userId, text: doc.summary.text, sortOrder: 0 }]
    : [];
  const summaryItems = summaries.map((s) => ({
    resumeId,
    summaryId: s.id,
    sortOrder: s.sortOrder,
  }));

  const experiences: {
    id: string;
    userId: string;
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    location: string;
    sortOrder: number;
  }[] = [];
  const experienceItems: { resumeId: string; experienceId: string; sortOrder: number }[] = [];
  const experienceBullets: { id: string; experienceId: string; text: string; sortOrder: number }[] =
    [];

  for (let i = 0; i < doc.experience.items.length; i++) {
    const ex = doc.experience.items[i]!;
    const exId = crypto.randomUUID();
    experiences.push({
      id: exId,
      userId,
      company: ex.company,
      role: ex.role,
      startDate: ex.start,
      endDate: ex.end,
      location: ex.location ?? "",
      sortOrder: i,
    });
    experienceItems.push({ resumeId, experienceId: exId, sortOrder: i });
    for (let bi = 0; bi < ex.bullets.length; bi++) {
      experienceBullets.push({
        id: crypto.randomUUID(),
        experienceId: exId,
        text: ex.bullets[bi]!,
        sortOrder: bi,
      });
    }
  }

  const educationRows: {
    id: string;
    userId: string;
    school: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    description: string;
    sortOrder: number;
  }[] = [];
  const educationItems: { resumeId: string; educationId: string; sortOrder: number }[] = [];
  const educationBullets: { id: string; educationId: string; text: string; sortOrder: number }[] =
    [];

  for (let i = 0; i < doc.education.items.length; i++) {
    const ed = doc.education.items[i]!;
    const edId = crypto.randomUUID();
    educationRows.push({
      id: edId,
      userId,
      school: ed.school,
      degree: ed.degree,
      field: ed.field ?? "",
      startDate: "",
      endDate: ed.year,
      description: "",
      sortOrder: i,
    });
    educationItems.push({ resumeId, educationId: edId, sortOrder: i });
    if (ed.bullets) {
      for (let bi = 0; bi < ed.bullets.length; bi++) {
        educationBullets.push({
          id: crypto.randomUUID(),
          educationId: edId,
          text: ed.bullets[bi]!,
          sortOrder: bi,
        });
      }
    }
  }

  const projects: {
    id: string;
    userId: string;
    name: string;
    url: string;
    homepageUrl: string;
    description: string;
    tech: string;
    sortOrder: number;
  }[] = doc.projects.items.map((p, i) => {
    const id = crypto.randomUUID();
    return {
      id,
      userId,
      name: p.name,
      url: p.url,
      homepageUrl: p.homepageUrl ?? "",
      description: p.description,
      tech: JSON.stringify(p.tech),
      sortOrder: i,
    };
  });
  const projectItems = projects.map((p) => ({ resumeId, projectId: p.id, sortOrder: p.sortOrder }));

  const skillGroups: { id: string; userId: string; name: string; sortOrder: number }[] = [];
  const skillGroupItems: { resumeId: string; groupId: string; sortOrder: number }[] = [];
  const skills: { id: string; groupId: string; name: string; level: null; sortOrder: number }[] =
    [];

  for (let gi = 0; gi < doc.skills.groups.length; gi++) {
    const g = doc.skills.groups[gi]!;
    const gId = crypto.randomUUID();
    skillGroups.push({ id: gId, userId, name: g.name, sortOrder: gi });
    skillGroupItems.push({ resumeId, groupId: gId, sortOrder: gi });
    for (let si = 0; si < g.items.length; si++) {
      skills.push({
        id: crypto.randomUUID(),
        groupId: gId,
        name: g.items[si]!,
        level: null,
        sortOrder: si,
      });
    }
  }

  const talks: {
    id: string;
    userId: string;
    title: string;
    event: string;
    date: string;
    description: string;
    links: string;
    sortOrder: number;
  }[] = doc.talks.items.map((t, i) => {
    const id = crypto.randomUUID();
    return {
      id,
      userId,
      title: t.title,
      event: t.event,
      date: t.date,
      description: "",
      links: JSON.stringify(t.links),
      sortOrder: i,
    };
  });
  const talkItems = talks.map((t) => ({ resumeId, talkId: t.id, sortOrder: t.sortOrder }));

  return {
    resume: {
      id: resumeId,
      fullName: doc.header.fullName,
      headline: doc.header.headline,
      templateId: doc.meta.templateId,
    },
    sections,
    contacts,
    contactItems,
    links,
    linkItems,
    summaries,
    summaryItems,
    experiences,
    experienceItems,
    experienceBullets,
    education: educationRows,
    educationItems,
    educationBullets,
    projects,
    projectItems,
    skillGroups,
    skillGroupItems,
    skills,
    talks,
    talkItems,
  };
}
