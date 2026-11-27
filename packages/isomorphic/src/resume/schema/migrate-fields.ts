import { SECTION_KEYS } from "./constants.ts";
import { asBool, asStr, coerceEnabledBlock } from "./coerce.ts";
import type { ResumeDocumentV1 } from "./document.ts";

export function migrateHeader(block: unknown): ResumeDocumentV1["header"] {
  return coerceEnabledBlock(block, true, (raw) => {
    const contacts = Array.isArray(raw.contacts)
      ? raw.contacts.flatMap((contact) => {
          if (typeof contact !== "object" || contact === null) return [];
          const row = contact as Record<string, unknown>;
          const value = asStr(row.value);
          const type = asStr(row.type);
          if (!value.trim()) return [];
          // email / location stay in their dedicated header fields, never the list
          if (type === "email" || type === "location") return [];
          return [{ type, value, label: asStr(row.label) }];
        })
      : [];
    return {
      fullName: asStr(raw.fullName),
      headline: asStr(raw.headline),
      email: asStr(raw.email),
      location: asStr(raw.location),
      ...(contacts.length > 0 ? { contacts } : {}),
      links: Array.isArray(raw.links)
        ? raw.links.flatMap((link) => {
            if (typeof link !== "object" || link === null) return [];
            const row = link as Record<string, unknown>;
            return [{ label: asStr(row.label), url: asStr(row.url) }];
          })
        : [],
    };
  });
}

export function migrateSummary(block: unknown): ResumeDocumentV1["summary"] {
  return coerceEnabledBlock(block, true, (raw) => ({
    text: asStr(raw.text),
  }));
}

export function migrateNotes(block: unknown): ResumeDocumentV1["notes"] {
  const notes = block as Record<string, unknown>;
  return {
    enabled: asBool(notes.enabled, Boolean(asStr(notes.text).trim())),
    label: asStr(notes.label).trim() || "Notes",
    text: asStr(notes.text),
  };
}

export function migrateSectionOrder(value: unknown): string[] {
  if (Array.isArray(value)) {
    const keys = SECTION_KEYS as readonly string[];
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const k of value as unknown[]) {
      if (typeof k === "string" && keys.includes(k) && !seen.has(k)) {
        seen.add(k);
        normalized.push(k);
      }
    }
    for (const k of keys) {
      if (!seen.has(k)) {
        normalized.push(k);
      }
    }
    return normalized;
  }
  return [...SECTION_KEYS];
}
