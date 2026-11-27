import type { SectionKey } from "./constants.ts";
import type { ResumeDocumentV1 } from "./document.ts";
import { resumeDocumentV1Schema } from "./document.ts";
import { migrateResumeDocumentV1 } from "./migrate.ts";

export function parseResumeJson(raw: string): ResumeDocumentV1 {
  return toResumeDocumentV1(JSON.parse(raw));
}

export function toResumeDocumentV1(parsed: unknown): ResumeDocumentV1 {
  return resumeDocumentV1Schema.parse(migrateResumeDocumentV1(parsed));
}

export function safeParseResumeJson(
  raw: string,
): { ok: true; data: ResumeDocumentV1 } | { ok: false; error: string } {
  try {
    const r = resumeDocumentV1Schema.safeParse(migrateResumeDocumentV1(JSON.parse(raw)));
    if (r.success) return { ok: true, data: r.data };
    return { ok: false, error: r.error.message };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

export function moveSectionOrder(
  order: SectionKey[],
  key: SectionKey,
  direction: -1 | 1,
): SectionKey[] {
  const idx = order.indexOf(key);
  if (idx < 0) return order;
  const next = idx + direction;
  if (next < 0 || next >= order.length) return order;
  const copy = [...order];
  const tmp = copy[idx];
  const swap = copy[next];
  if (tmp === undefined || swap === undefined) return order;
  copy[idx] = swap;
  copy[next] = tmp;
  return copy;
}
