import { asStr, asStringArray, coerceEnabledBlock } from "./coerce";
import type { ResumeDocumentV1 } from "./document";

export function migrateExperience(block: unknown): ResumeDocumentV1["experience"] {
  return coerceEnabledBlock(block, true, (raw) => ({
    items: Array.isArray(raw.items)
      ? raw.items.flatMap((item) => {
          if (typeof item !== "object" || item === null) return [];
          const row = item as Record<string, unknown>;
          return [
            {
              company: asStr(row.company),
              role: asStr(row.role),
              start: asStr(row.start),
              end: asStr(row.end),
              ...(row.location == null || asStr(row.location) === ""
                ? {}
                : { location: asStr(row.location) }),
              bullets: asStringArray(row.bullets),
            },
          ];
        })
      : [],
  }));
}

export function migrateEducation(block: unknown): ResumeDocumentV1["education"] {
  return coerceEnabledBlock(block, true, (raw) => ({
    items: Array.isArray(raw.items)
      ? raw.items.flatMap((item) => {
          if (typeof item !== "object" || item === null) return [];
          const row = item as Record<string, unknown>;
          const bullets = asStringArray(row.bullets);
          return [
            {
              school: asStr(row.school),
              degree: asStr(row.degree),
              ...(row.field == null || asStr(row.field) === "" ? {} : { field: asStr(row.field) }),
              year: asStr(row.year),
              ...(asStr(row.description) === "" ? {} : { description: asStr(row.description) }),
              ...(bullets.length > 0 ? { bullets } : {}),
            },
          ];
        })
      : [],
  }));
}

export function migrateProjects(block: unknown): ResumeDocumentV1["projects"] {
  return coerceEnabledBlock(block, true, (raw) => ({
    items: Array.isArray(raw.items)
      ? raw.items.flatMap((item) => {
          if (typeof item !== "object" || item === null) return [];
          const row = item as Record<string, unknown>;
          return [
            {
              name: asStr(row.name),
              url: asStr(row.url),
              ...(row.homepageUrl == null || asStr(row.homepageUrl) === ""
                ? {}
                : { homepageUrl: asStr(row.homepageUrl) }),
              description: asStr(row.description),
              tech: asStringArray(row.tech),
            },
          ];
        })
      : [],
  }));
}

export function migrateTalks(block: unknown): ResumeDocumentV1["talks"] {
  return coerceEnabledBlock(block, false, (raw) => ({
    items: Array.isArray(raw.items)
      ? raw.items.flatMap((item) => {
          if (typeof item !== "object" || item === null) return [];
          const row = item as Record<string, unknown>;
          return [
            {
              title: asStr(row.title),
              event: asStr(row.event),
              date: asStr(row.date),
              links: Array.isArray(row.links)
                ? row.links.flatMap((link) => {
                    if (typeof link !== "object" || link === null) return [];
                    const pair = link as Record<string, unknown>;
                    return [{ label: asStr(pair.label), url: asStr(pair.url) }];
                  })
                : [],
            },
          ];
        })
      : [],
  }));
}

export function migrateSkills(block: unknown): ResumeDocumentV1["skills"] {
  return coerceEnabledBlock(block, true, (raw) => ({
    groups: Array.isArray(raw.groups)
      ? raw.groups.flatMap((group) => {
          if (typeof group !== "object" || group === null) return [];
          const row = group as Record<string, unknown>;
          return [{ name: asStr(row.name), items: asStringArray(row.items) }];
        })
      : [],
  }));
}
