import { defaultNotesBlock, defaultTalksBlock, migrateTemplateId } from "./coerce.ts";
import {
  migrateHeader,
  migrateNotes,
  migrateSectionOrder,
  migrateSummary,
} from "./migrate-fields.ts";
import {
  migrateEducation,
  migrateExperience,
  migrateProjects,
  migrateSkills,
  migrateTalks,
} from "./migrate-items.ts";

function hasBlock(source: Record<string, unknown>, key: string): boolean {
  return key in source && typeof source[key] === "object" && source[key] !== null;
}

export function migrateResumeDocumentV1(parsed: unknown): unknown {
  const withTemplate = migrateTemplateId(parsed);
  if (typeof withTemplate !== "object" || withTemplate === null) {
    return withTemplate;
  }
  const o = withTemplate as Record<string, unknown>;
  const out: Record<string, unknown> = { ...o, version: 1 };

  out.header = migrateHeader(out.header);
  out.summary = migrateSummary(out.summary);
  out.experience = migrateExperience(out.experience);
  out.education = migrateEducation(out.education);
  out.projects = migrateProjects(out.projects);
  out.talks = hasBlock(out, "talks") ? migrateTalks(out.talks) : defaultTalksBlock();
  out.skills = migrateSkills(out.skills);
  out.notes = hasBlock(out, "notes") ? migrateNotes(out.notes) : defaultNotesBlock();
  out.sectionOrder = migrateSectionOrder(out.sectionOrder);
  return out;
}
