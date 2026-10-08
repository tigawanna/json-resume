/**
 * What makes two library rows "the same thing". Writers resolve to an existing
 * row with the same key instead of inserting; compaction merges rows that
 * share one. Keys are scoped per owner by the caller.
 */

export function norm(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function key(...parts: unknown[]): string | null {
  const normalized = parts.map(norm);
  if (normalized.every((part) => part === "")) return null;
  return normalized.join("\u241f");
}

type Row = Record<string, unknown>;

/** Collections whose rows are shared library entities, keyed by natural identity. */
export const libraryKeys = {
  resumeExperience: (row: Row) => key(row.company, row.role, row.startDate),
  resumeEducation: (row: Row) => key(row.school, row.degree, row.field),
  resumeProject: (row: Row) => key(row.name, row.url),
  resumeTalk: (row: Row) => key(row.title, row.event),
  resumeContact: (row: Row) => key(row.type, row.value),
  resumeLink: (row: Row) => key(row.url),
  resumeSummary: (row: Row) => key(row.text),
  resumeNote: (row: Row) => key(row.label, row.text),
  resumeLanguage: (row: Row) => key(row.name),
  resumeCertification: (row: Row) => key(row.name, row.issuer),
  resumeVolunteer: (row: Row) => key(row.organization, row.role, row.startDate),
  resumeSkill: (row: Row) => key(row.name),
} satisfies Record<string, (row: Row) => string | null>;

export type LibraryCollectionId = keyof typeof libraryKeys;

/** A bullet is unique within its experience. */
export function bulletKey(row: { experienceId: string; text: string }): string | null {
  const text = norm(row.text);
  return text ? `${row.experienceId}\u241f${text}` : null;
}
