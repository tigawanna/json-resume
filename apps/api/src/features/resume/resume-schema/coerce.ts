import { TEMPLATE_IDS, type TemplateId } from "./constants";
import type { ResumeDocumentV1 } from "./document";

export function asBool(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (value === 0 || value === "0" || value === "false" || value === "FALSE") return false;
  if (value === 1 || value === "1" || value === "true" || value === "TRUE") return true;
  if (value == null) return fallback;
  return Boolean(value);
}

export function asStr(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return "";
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asStr(item)).filter((item) => item.length > 0);
}

export function coerceEnabledBlock<T extends Record<string, unknown>>(
  block: unknown,
  fallbackEnabled: boolean,
  extra: (raw: Record<string, unknown>) => T,
): T & { enabled: boolean } {
  const raw = typeof block === "object" && block !== null ? (block as Record<string, unknown>) : {};
  return { enabled: asBool(raw.enabled, fallbackEnabled), ...extra(raw) };
}

export function migrateTemplateId(parsed: unknown): unknown {
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "meta" in parsed &&
    typeof (parsed as Record<string, unknown>).meta === "object"
  ) {
    const meta = (parsed as Record<string, Record<string, unknown>>).meta;
    if (meta && !TEMPLATE_IDS.includes(meta.templateId as TemplateId)) {
      return { ...(parsed as Record<string, unknown>), meta: { ...meta, templateId: "classic" } };
    }
  }
  return parsed;
}

export const defaultTalksBlock = (): ResumeDocumentV1["talks"] => ({
  enabled: false,
  items: [],
});

export const defaultNotesBlock = (): ResumeDocumentV1["notes"] => ({
  enabled: false,
  label: "Notes",
  text: "",
});
