import type { LibraryHit, LibrarySection, RankedLibraryItem } from "../resume-tool-schemas";
import { matchedKeywords } from "./rank";
import { parseTech } from "./resume-view";

/** A library row as search and ranking show it, before `onResume` is known. */
export type LibraryHitBase = Omit<LibraryHit, "onResume">;

function joined(parts: ReadonlyArray<string | null | undefined>, separator = ", ") {
  return parts.filter((part) => part?.trim()).join(separator);
}

function dates(startDate: string, endDate: string) {
  return startDate ? `${startDate} - ${endDate || "present"}` : endDate;
}

export function summaryHit(row: { id: string; text: string }): LibraryHitBase {
  return { id: row.id, title: "Summary", detail: row.text, experienceId: null };
}

export function experienceHit(row: {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  location: string;
}): LibraryHitBase {
  return {
    id: row.id,
    title: joined([row.role, row.company], " at "),
    detail: joined([dates(row.startDate, row.endDate), row.location]),
    experienceId: null,
  };
}

export function bulletHit(
  row: { id: string; text: string; experienceId: string },
  experience: { company: string; role: string } | undefined,
): LibraryHitBase {
  return {
    id: row.id,
    title: row.text,
    detail: experience ? joined([experience.role, experience.company], " at ") : "",
    experienceId: row.experienceId,
  };
}

export function educationHit(row: {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}): LibraryHitBase {
  return {
    id: row.id,
    title: row.school,
    detail: joined([joined([row.degree, row.field], " "), dates(row.startDate, row.endDate)]),
    experienceId: null,
  };
}

export function projectHit(row: {
  id: string;
  name: string;
  description: string;
  tech: string;
}): LibraryHitBase {
  const tech = parseTech(row.tech);
  return {
    id: row.id,
    title: row.name,
    detail: joined([row.description, tech.length ? `Tech: ${tech.join(", ")}` : ""], " "),
    experienceId: null,
  };
}

export function talkHit(row: {
  id: string;
  title: string;
  event: string;
  date: string;
  description: string;
}): LibraryHitBase {
  return {
    id: row.id,
    title: row.title,
    detail: joined([joined([row.event, row.date]), row.description], ". "),
    experienceId: null,
  };
}

export function skillHit(row: { id: string; name: string }): LibraryHitBase {
  return { id: row.id, title: row.name, detail: "", experienceId: null };
}

export function withOnResume(hit: LibraryHitBase, onResume: ReadonlySet<string>): LibraryHit {
  return { ...hit, onResume: onResume.has(hit.id) };
}

/** Rows mentioning the most job keywords first; rows mentioning none are dropped. */
export function rankLibraryItems(
  keywords: ReadonlyArray<string>,
  items: ReadonlyArray<LibraryHit & { section: LibrarySection }>,
  limit: number,
): RankedLibraryItem[] {
  return items
    .map((item) => {
      const matchedTerms = matchedKeywords(keywords, `${item.title} ${item.detail}`);
      return { ...item, score: matchedTerms.length, matchedTerms };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}
