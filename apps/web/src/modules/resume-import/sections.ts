import { libraryKeys, norm } from "@/modules/library/library-keys";
import { joinSearchable, libraryRowBase, nowMs } from "@/routes/_dashboard/-utils/row-helpers";
import { textSimilarity } from "@/utils/text-similarity";
import {
  canonicalDate,
  canonicalName,
  canonicalSkill,
  canonicalUrl,
  similarCompany,
  similarRole,
} from "./normalize";
import { defineSection } from "./reconcile";

const sameDate = (a: string, b: string) => canonicalDate(a) === canonicalDate(b);
const sameUrl = (a: string, b: string) => canonicalUrl(a) === canonicalUrl(b);

function parseStringList(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function parseLinks(json: string): { label: string; url: string }[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item: unknown) => {
      if (typeof item !== "object" || item === null) return [];
      const label = "label" in item && typeof item.label === "string" ? item.label : "";
      const url = "url" in item && typeof item.url === "string" ? item.url : "";
      return url || label ? [{ label, url }] : [];
    });
  } catch {
    return [];
  }
}

const sameTech = (a: string, b: string) => {
  const left = new Set(parseStringList(a).map(canonicalSkill));
  const right = new Set(parseStringList(b).map(canonicalSkill));
  return left.size === right.size && [...left].every((item) => right.has(item));
};
const formatTech = (json: string) => parseStringList(json).join(", ");

const sameLinks = (a: string, b: string) =>
  parseLinks(a)
    .map((link) => canonicalUrl(link.url))
    .join("|") ===
  parseLinks(b)
    .map((link) => canonicalUrl(link.url))
    .join("|");
const formatLinks = (json: string) =>
  parseLinks(json)
    .map((link) => link.label || link.url)
    .join(", ");

function preview(text: string, max = 90) {
  const flat = text.trim().replace(/\s+/g, " ");
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

export const contactSection = defineSection({
  section: "contacts",
  fields: [
    { key: "type", label: "Type", kind: "identity" },
    { key: "value", label: "Value", kind: "identity" },
    { key: "label", label: "Label", kind: "fact" },
  ],
  label: (values) => `${values.label || values.type}: ${values.value}`,
  exactKey: libraryKeys.resumeContact,
  rows: (db) => db.collections.resumeContact.toArray,
  insert(db, id, userId, values) {
    db.collections.resumeContact.insert({
      ...libraryRowBase(userId),
      id,
      ...values,
      searchableText: joinSearchable(values.type, values.value, values.label),
    });
  },
  update(db, id, values) {
    db.collections.resumeContact.update(id, (draft) => {
      draft.type = values.type;
      draft.value = values.value;
      draft.label = values.label;
      draft.searchableText = joinSearchable(values.type, values.value, values.label);
      draft.updatedAt = nowMs();
    });
  },
});

export const linkSection = defineSection({
  section: "links",
  fields: [
    { key: "label", label: "Label", kind: "fact" },
    { key: "url", label: "URL", kind: "fact", same: sameUrl },
  ],
  label: (values) => values.label || values.url,
  exactKey: libraryKeys.resumeLink,
  closeScore: (incoming, candidate) =>
    canonicalUrl(incoming.url) && canonicalUrl(incoming.url) === canonicalUrl(candidate.url)
      ? 0.95
      : 0,
  rows: (db) => db.collections.resumeLink.toArray,
  insert(db, id, userId, values) {
    db.collections.resumeLink.insert({
      ...libraryRowBase(userId),
      id,
      ...values,
      icon: null,
      searchableText: joinSearchable(values.label, values.url),
    });
  },
  update(db, id, values) {
    db.collections.resumeLink.update(id, (draft) => {
      draft.label = values.label;
      draft.url = values.url;
      draft.searchableText = joinSearchable(values.label, values.url);
      draft.updatedAt = nowMs();
    });
  },
});

export const summarySection = defineSection({
  section: "summaries",
  fields: [{ key: "text", label: "Text", kind: "wording" }],
  label: (values) => preview(values.text),
  exactKey: libraryKeys.resumeSummary,
  rows: (db) => db.collections.resumeSummary.toArray,
  insert(db, id, userId, values) {
    db.collections.resumeSummary.insert({
      ...libraryRowBase(userId),
      id,
      text: values.text,
      searchableText: values.text,
    });
  },
  update(db, id, values) {
    db.collections.resumeSummary.update(id, (draft) => {
      draft.text = values.text;
      draft.searchableText = values.text;
      draft.updatedAt = nowMs();
    });
  },
});

export const noteSection = defineSection({
  section: "notes",
  fields: [
    { key: "label", label: "Heading", kind: "identity" },
    { key: "text", label: "Text", kind: "wording" },
  ],
  label: (values) => `${values.label}: ${preview(values.text, 70)}`,
  exactKey: libraryKeys.resumeNote,
  rows: (db) => db.collections.resumeNote.toArray,
  insert(db, id, userId, values) {
    db.collections.resumeNote.insert({
      ...libraryRowBase(userId),
      id,
      ...values,
      searchableText: joinSearchable(values.label, values.text),
    });
  },
  update(db, id, values) {
    db.collections.resumeNote.update(id, (draft) => {
      draft.label = values.label;
      draft.text = values.text;
      draft.searchableText = joinSearchable(values.label, values.text);
      draft.updatedAt = nowMs();
    });
  },
});

export const experienceSection = defineSection({
  section: "experiences",
  fields: [
    { key: "company", label: "Company", kind: "identity" },
    { key: "role", label: "Role", kind: "identity" },
    { key: "startDate", label: "Start", kind: "fact", same: sameDate },
    { key: "endDate", label: "End", kind: "fact", same: sameDate },
    { key: "location", label: "Location", kind: "fact" },
  ],
  label: (values) => [values.role, values.company].filter(Boolean).join(" at "),
  exactKey: libraryKeys.resumeExperience,
  closeScore(incoming, candidate) {
    const company = similarCompany(incoming.company, candidate.company);
    if (company < 0.8) return 0;
    const role = similarRole(incoming.role, candidate.role);
    const start = canonicalDate(incoming.startDate);
    const sameStart = start !== "" && start === canonicalDate(candidate.startDate);
    if (role < 0.6 && !sameStart) return 0;
    return 0.4 * company + 0.4 * role + (sameStart ? 0.2 : 0);
  },
  rows: (db) => db.collections.resumeExperience.toArray,
  insert(db, id, userId, values) {
    db.collections.resumeExperience.insert({
      ...libraryRowBase(userId),
      id,
      ...values,
      searchableText: joinSearchable(values.company, values.role, values.location),
    });
  },
  update(db, id, values) {
    db.collections.resumeExperience.update(id, (draft) => {
      draft.company = values.company;
      draft.role = values.role;
      draft.startDate = values.startDate;
      draft.endDate = values.endDate;
      draft.location = values.location;
      draft.searchableText = joinSearchable(values.company, values.role, values.location);
      draft.updatedAt = nowMs();
    });
  },
});

export const educationSection = defineSection({
  section: "education",
  fields: [
    { key: "school", label: "School", kind: "identity" },
    { key: "degree", label: "Degree", kind: "identity" },
    { key: "field", label: "Field", kind: "identity" },
    { key: "startDate", label: "Start", kind: "fact", same: sameDate },
    { key: "endDate", label: "Year", kind: "fact", same: sameDate },
    { key: "description", label: "Description", kind: "wording" },
  ],
  label: (values) => [values.degree, values.field, values.school].filter(Boolean).join(", "),
  exactKey: libraryKeys.resumeEducation,
  closeScore(incoming, candidate) {
    const school = similarCompany(incoming.school, candidate.school);
    if (school < 0.8) return 0;
    const degree = textSimilarity(incoming.degree, candidate.degree);
    const sameField =
      Boolean(norm(incoming.field)) && norm(incoming.field) === norm(candidate.field);
    if (degree < 0.5 && !sameField) return 0;
    return 0.6 * school + 0.4 * Math.max(degree, sameField ? 1 : 0);
  },
  rows: (db) => db.collections.resumeEducation.toArray,
  insert(db, id, userId, values) {
    db.collections.resumeEducation.insert({
      ...libraryRowBase(userId),
      id,
      ...values,
      searchableText: joinSearchable(values.school, values.degree, values.field),
    });
  },
  update(db, id, values) {
    db.collections.resumeEducation.update(id, (draft) => {
      draft.school = values.school;
      draft.degree = values.degree;
      draft.field = values.field;
      draft.startDate = values.startDate;
      draft.endDate = values.endDate;
      draft.description = values.description;
      draft.searchableText = joinSearchable(values.school, values.degree, values.field);
      draft.updatedAt = nowMs();
    });
  },
});

export const projectSection = defineSection({
  section: "projects",
  fields: [
    { key: "name", label: "Name", kind: "identity" },
    { key: "url", label: "Repository", kind: "fact", same: sameUrl },
    { key: "homepageUrl", label: "Homepage", kind: "fact", same: sameUrl },
    { key: "description", label: "Description", kind: "wording" },
    { key: "tech", label: "Tech", kind: "wording", same: sameTech, format: formatTech },
  ],
  label: (values) => values.name || values.url,
  exactKey: libraryKeys.resumeProject,
  closeScore(incoming, candidate) {
    const url = canonicalUrl(incoming.url);
    if (url && url === canonicalUrl(candidate.url)) return 0.95;
    const name = canonicalName(incoming.name);
    if (name && name === canonicalName(candidate.name)) return 0.9;
    const similarity = textSimilarity(incoming.name, candidate.name);
    return similarity >= 0.85 ? 0.9 * similarity : 0;
  },
  rows: (db) => db.collections.resumeProject.toArray,
  insert(db, id, userId, values) {
    db.collections.resumeProject.insert({
      ...libraryRowBase(userId),
      id,
      ...values,
      searchableText: joinSearchable(values.name, values.description, values.url),
    });
  },
  update(db, id, values) {
    db.collections.resumeProject.update(id, (draft) => {
      draft.name = values.name;
      draft.url = values.url;
      draft.homepageUrl = values.homepageUrl;
      draft.description = values.description;
      draft.tech = values.tech;
      draft.searchableText = joinSearchable(values.name, values.description, values.url);
      draft.updatedAt = nowMs();
    });
  },
});

export const talkSection = defineSection({
  section: "talks",
  fields: [
    { key: "title", label: "Title", kind: "identity" },
    { key: "event", label: "Event", kind: "identity" },
    { key: "date", label: "Date", kind: "fact", same: sameDate },
    { key: "links", label: "Links", kind: "fact", same: sameLinks, format: formatLinks },
  ],
  label: (values) => [values.title, values.event].filter(Boolean).join(" · "),
  exactKey: libraryKeys.resumeTalk,
  closeScore(incoming, candidate) {
    const title = textSimilarity(incoming.title, candidate.title);
    if (title < 0.8) return 0;
    return 0.8 * title + 0.2 * textSimilarity(incoming.event, candidate.event);
  },
  rows: (db) => db.collections.resumeTalk.toArray,
  insert(db, id, userId, values) {
    db.collections.resumeTalk.insert({
      ...libraryRowBase(userId),
      id,
      ...values,
      description: "",
      searchableText: joinSearchable(values.title, values.event),
    });
  },
  update(db, id, values) {
    db.collections.resumeTalk.update(id, (draft) => {
      draft.title = values.title;
      draft.event = values.event;
      draft.date = values.date;
      draft.links = values.links;
      draft.searchableText = joinSearchable(values.title, values.event, draft.description);
      draft.updatedAt = nowMs();
    });
  },
});

export const skillGroupSection = defineSection({
  section: "skillGroups",
  fields: [{ key: "name", label: "Name", kind: "identity" }],
  label: (values) => values.name,
  exactKey: (values) => norm(values.name) || null,
  rows: (db) => db.collections.resumeSkillGroup.toArray,
  insert(db, id, userId, values) {
    db.collections.resumeSkillGroup.insert({
      ...libraryRowBase(userId),
      id,
      name: values.name.trim(),
      searchableText: values.name.trim(),
    });
  },
  update(db, id, values) {
    db.collections.resumeSkillGroup.update(id, (draft) => {
      draft.name = values.name.trim();
      draft.searchableText = values.name.trim();
      draft.updatedAt = nowMs();
    });
  },
});

export const skillSection = defineSection({
  section: "skills",
  fields: [{ key: "name", label: "Name", kind: "identity" }],
  label: (values) => values.name,
  exactKey: libraryKeys.resumeSkill,
  closeScore: (incoming, candidate) => {
    const skill = canonicalSkill(incoming.name);
    return skill && skill === canonicalSkill(candidate.name) ? 0.9 : 0;
  },
  rows: (db) => db.collections.resumeSkill.toArray,
  insert(db, id, userId, values) {
    db.collections.resumeSkill.insert({
      ...libraryRowBase(userId),
      id,
      name: values.name.trim(),
      level: null,
      searchableText: values.name.trim(),
    });
  },
  update(db, id, values) {
    db.collections.resumeSkill.update(id, (draft) => {
      draft.name = values.name.trim();
      draft.searchableText = values.name.trim();
      draft.updatedAt = nowMs();
    });
  },
});
