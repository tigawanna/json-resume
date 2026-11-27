import { SECTION_KEYS, type SectionKey } from "../resume/schema.ts";
import type { ResumeView, ResumeViewSection } from "./tool-schemas/resume/view.ts";
import { parseTalkLinks, parseTech } from "./resume-view/parse.ts";
import type { ResumeViewSource } from "./resume-view/source.ts";

export { parseTalkLinks, parseTech } from "./resume-view/parse.ts";
export type { ResumeViewSource } from "./resume-view/source.ts";

function isSectionKey(key: string): key is SectionKey {
  return SECTION_KEYS.some((sectionKey) => sectionKey === key);
}

function bySortOrder<T extends { sortOrder: number }>(rows: ReadonlyArray<T>): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * `get_resume` output, shared by the local and remote implementations so both return the same shape.
 * Every item carries its library row id so later tool calls can target it.
 */
export function resumeView(
  detail: ResumeViewSource,
  sections?: ReadonlyArray<ResumeViewSection>,
): ResumeView {
  const include = (section: ResumeViewSection) => !sections || sections.includes(section);

  const orderedSections = bySortOrder(detail.sections).filter((section) =>
    isSectionKey(section.key),
  );
  const sectionOrder = orderedSections.map((section) => section.key).filter(isSectionKey);
  for (const key of SECTION_KEYS) {
    if (!sectionOrder.includes(key)) sectionOrder.push(key);
  }
  const hiddenSections = orderedSections
    .filter((section) => !section.enabled)
    .map((section) => section.key)
    .filter(isSectionKey);

  const job = detail.job;

  return {
    id: detail.id,
    name: detail.name,
    description: detail.description,
    templateId: detail.templateId,
    updatedAt: detail.updatedAt,
    sectionOrder,
    hiddenSections,
    job: job
      ? {
          id: job.id,
          company: job.company,
          title: job.title,
          status: job.status,
          location: job.location,
          payRate: job.payRate,
          url: job.url,
          ...(include("job") ? { description: job.description } : {}),
        }
      : null,
    ...(include("header")
      ? {
          header: {
            fullName: detail.fullName,
            headline: detail.headline,
            contacts: bySortOrder(detail.contacts).map(({ id, type, value, label }) => ({
              id,
              type,
              value,
              label,
            })),
            links: bySortOrder(detail.links).map(({ id, label, url }) => ({ id, label, url })),
          },
        }
      : {}),
    ...(include("summary")
      ? { summary: bySortOrder(detail.summaries).map(({ id, text }) => ({ id, text })) }
      : {}),
    ...(include("experience")
      ? {
          experience: bySortOrder(detail.experiences).map((item) => ({
            id: item.id,
            company: item.company,
            role: item.role,
            startDate: item.startDate,
            endDate: item.endDate,
            location: item.location,
            bullets: bySortOrder(item.bullets).map(({ id, text }) => ({ id, text })),
          })),
        }
      : {}),
    ...(include("education")
      ? {
          education: bySortOrder(detail.education).map((item) => ({
            id: item.id,
            school: item.school,
            degree: item.degree,
            field: item.field,
            startDate: item.startDate,
            endDate: item.endDate,
            description: item.description,
            bullets: bySortOrder(item.bullets).map(({ id, text }) => ({ id, text })),
          })),
        }
      : {}),
    ...(include("projects")
      ? {
          projects: bySortOrder(detail.projects).map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            tech: parseTech(item.tech),
            url: item.url,
            homepageUrl: item.homepageUrl,
          })),
        }
      : {}),
    ...(include("talks")
      ? {
          talks: bySortOrder(detail.talks).map(
            ({ id, title, event, date, description, links }) => ({
              id,
              title,
              event,
              date,
              description,
              links: parseTalkLinks(links),
            }),
          ),
        }
      : {}),
    ...(include("skills")
      ? {
          skills: bySortOrder(detail.skillGroups).map((group) => ({
            id: group.id,
            name: group.name,
            skills: bySortOrder(group.skills).map(({ id, name }) => ({ id, name })),
          })),
        }
      : {}),
    ...(include("notes")
      ? { notes: bySortOrder(detail.notes).map(({ id, label, text }) => ({ id, label, text })) }
      : {}),
  };
}
