import type { HistoryEvent } from "@/data-access-layer/event-sourced/event-history";
import type { MutationType } from "event-sourced-collection";

const LABEL_FIELDS = [
  "name",
  "title",
  "role",
  "company",
  "school",
  "label",
  "text",
  "value",
  "url",
];
const UNCOMPARED_FIELDS = new Set(["updatedAt", "searchableText", "embedding"]);

/** "resumeExperienceBulletItem" → "Experience bullet item" */
export function collectionLabel(collectionId: string): string {
  const words = collectionId
    .replace(/^resume(?=[A-Z])/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function summaryOf(payload: Record<string, unknown>): string | null {
  for (const field of LABEL_FIELDS) {
    const value = payload[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** Fields an update actually changed, ignoring bookkeeping columns. */
export function changedFields(event: HistoryEvent): string[] {
  if (event.type !== "update" || !event.previous) return [];
  const previous = event.previous;
  const keys = new Set([...Object.keys(previous), ...Object.keys(event.payload)]);
  return [...keys].filter(
    (key) =>
      !UNCOMPARED_FIELDS.has(key) &&
      JSON.stringify(previous[key]) !== JSON.stringify(event.payload[key]),
  );
}

export function eventStatus(event: HistoryEvent): string {
  if (event.origin === "remote") return "received";
  return event.synced ? "pushed" : "pending";
}

export const TYPE_STYLES: Record<MutationType, string> = {
  insert: "border-success/30 bg-success/15 text-success",
  update: "border-warning/30 bg-warning/15 text-warning",
  delete: "border-error/30 bg-error/15 text-error",
};
