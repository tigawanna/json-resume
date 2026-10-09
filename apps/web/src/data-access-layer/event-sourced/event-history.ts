import { layoutReferencedIds, resumeLayoutSchema } from "@/features/resume/resume-layout";
import {
  planRestore,
  planSquash,
  type RestorableEvent,
  type RestorePlan,
} from "@/modules/sync/squash-plan";
import type { InboxEntry, OutboxEntry } from "event-sourced-collection";
import type { z } from "zod";
import type { AppCollectionDefs, AppDb } from "./collection";
import { linkedEntityIds } from "./library-resolve";
import * as s from "./schemas";

/** Unpushed outbox events have no server seq yet; they sort after everything pulled. */
const PENDING_ORDER_BASE = 2 ** 50;

export type HistoryEvent = RestorableEvent & {
  origin: "local" | "remote";
  synced: boolean;
  timestamp: number;
};

const rowOf = (event: { collectionId: string; key: string }) =>
  `${event.collectionId}\u0000${event.key}`;

function fromOutbox(entry: OutboxEntry): HistoryEvent {
  const seq = entry.globalSeq ?? 0;
  return {
    id: entry.eventId,
    collectionId: entry.collectionId,
    key: String(entry.key),
    type: entry.type,
    payload: entry.payload,
    previous: entry.previous,
    order: seq > 0 ? seq : PENDING_ORDER_BASE + entry.localSeq,
    at: entry.timestamp,
    timestamp: entry.timestamp,
    pinned: !entry.sync,
    origin: "local",
    synced: entry.sync,
  };
}

function fromInbox(entry: InboxEntry, newestSeq: number): HistoryEvent {
  return {
    id: entry.eventId,
    collectionId: entry.collectionId,
    key: String(entry.key),
    type: entry.type,
    payload: entry.payload,
    previous: entry.previous,
    order: entry.globalSeq,
    at: entry.timestamp,
    timestamp: entry.timestamp,
    // The pull cursor falls back to the newest inbox seq, so that row must stay.
    pinned: !entry.sync || entry.skipped || entry.globalSeq === newestSeq,
    origin: "remote",
    synced: entry.sync,
  };
}

/** This device's outbox and inbox as one log, newest first. */
export function mergeEventHistory(
  outbox: readonly OutboxEntry[],
  inbox: readonly InboxEntry[],
): HistoryEvent[] {
  const newestSeq = inbox.reduce((max, entry) => Math.max(max, entry.globalSeq), 0);
  const byId = new Map<string, HistoryEvent>();
  for (const entry of outbox) byId.set(entry.eventId, fromOutbox(entry));
  for (const entry of inbox) {
    const remote = fromInbox(entry, newestSeq);
    const local = byId.get(entry.eventId);
    if (!local) byId.set(entry.eventId, remote);
    else if (remote.pinned) local.pinned = true;
  }
  return [...byId.values()].sort((a, b) => b.order - a.order);
}

/**
 * Every event for a row that belongs to the résumé: the résumé itself, rows
 * scoped to it, and library rows it links to now or linked to in its history.
 * All of a row's events are kept together so squash and restore see the full chain.
 */
export function resumeEventHistory(
  db: AppDb,
  events: readonly HistoryEvent[],
  resumeId: string,
): HistoryEvent[] {
  const linked = linkedEntityIds(db, resumeId);
  for (const event of events) {
    if (event.collectionId === "resume" && event.key === resumeId) {
      const past = resumeLayoutSchema.safeParse(event.payload.layout);
      if (past.success) for (const id of layoutReferencedIds(past.data)) linked.add(id);
      continue;
    }
    if (event.payload.resumeId !== resumeId) continue;
    for (const [field, value] of Object.entries(event.payload)) {
      if (field !== "id" && field !== "resumeId" && field.endsWith("Id")) {
        if (typeof value === "string") linked.add(value);
      }
    }
  }

  const rows = new Set<string>();
  for (const event of events) {
    if (
      (event.collectionId === "resume" && event.key === resumeId) ||
      event.payload.resumeId === resumeId ||
      linked.has(event.key)
    ) {
      rows.add(rowOf(event));
    }
  }
  return events.filter((event) => rows.has(rowOf(event)));
}

/**
 * Deletes superseded synced events from this device. Pending outbox rows,
 * unresolved inbox rows and the newest inbox row are never touched.
 */
export async function squashLocalEvents(
  db: AppDb,
  events: readonly HistoryEvent[],
  before: number,
) {
  const plan = planSquash(events, { before });
  if (plan.remove.length === 0) return plan;

  // Prunes nothing, but persists the pull cursor first so trimming the inbox can't rewind it.
  await db.pruneSyncedEvents({ olderThanMs: Number.MAX_SAFE_INTEGER });

  const ids = plan.remove.map((event) => event.id);
  const outboxIds = ids.filter((id) => db.collections.outbox.has(id));
  const inboxIds = ids.filter((id) => db.collections.inbox.has(id));
  if (outboxIds.length > 0) await db.collections.outbox.delete(outboxIds).isPersisted.promise;
  if (inboxIds.length > 0) await db.collections.inbox.delete(inboxIds).isPersisted.promise;
  return plan;
}

type RowWriter = {
  has: (key: string) => boolean;
  read: (key: string) => Record<string, unknown> | undefined;
  upsert: (key: string, row: Record<string, unknown>) => void;
  remove: (key: string) => void;
};

function rowWriter<T extends object>(
  collection: {
    has: (key: string) => boolean;
    get: (key: string) => T | undefined;
    insert: (row: T) => unknown;
    update: (key: string, updater: (draft: T) => void) => unknown;
    delete: (key: string) => unknown;
  },
  schema: z.ZodType<T>,
): RowWriter {
  return {
    has: (key) => collection.has(key),
    read(key) {
      const row = collection.get(key);
      return row ? Object.fromEntries(Object.entries(row)) : undefined;
    },
    upsert(key, row) {
      const parsed = schema.parse(row);
      if (!collection.has(key)) {
        collection.insert(parsed);
        return;
      }
      collection.update(key, (draft) => {
        Object.assign(draft, parsed);
      });
    },
    remove: (key) => {
      collection.delete(key);
    },
  };
}

/** `satisfies` keeps this in step with the registry: a new synced collection fails to compile until it is listed. */
function rowWriters(db: AppDb) {
  const c = db.collections;
  return {
    resume: rowWriter(c.resume, s.resumeSchema),
    resumeExperience: rowWriter(c.resumeExperience, s.resumeExperienceSchema),
    resumeExperienceBullet: rowWriter(c.resumeExperienceBullet, s.resumeExperienceBulletSchema),
    resumeEducation: rowWriter(c.resumeEducation, s.resumeEducationSchema),
    resumeEducationBullet: rowWriter(c.resumeEducationBullet, s.resumeEducationBulletSchema),
    resumeSkillGroup: rowWriter(c.resumeSkillGroup, s.resumeSkillGroupSchema),
    resumeSkill: rowWriter(c.resumeSkill, s.resumeSkillSchema),
    resumeContact: rowWriter(c.resumeContact, s.resumeContactSchema),
    resumeProject: rowWriter(c.resumeProject, s.resumeProjectSchema),
    resumeSummary: rowWriter(c.resumeSummary, s.resumeSummarySchema),
    resumeNote: rowWriter(c.resumeNote, s.resumeNoteSchema),
    resumeLink: rowWriter(c.resumeLink, s.resumeLinkSchema),
    resumeLanguage: rowWriter(c.resumeLanguage, s.resumeLanguageSchema),
    resumeCertification: rowWriter(c.resumeCertification, s.resumeCertificationSchema),
    resumeVolunteer: rowWriter(c.resumeVolunteer, s.resumeVolunteerSchema),
    resumeTalk: rowWriter(c.resumeTalk, s.resumeTalkSchema),
    resumeAiChat: rowWriter(c.resumeAiChat, s.resumeAiChatSchema),
    resumeAiConversation: rowWriter(c.resumeAiConversation, s.resumeAiConversationSchema),
    resumeAiMessage: rowWriter(c.resumeAiMessage, s.resumeAiMessageSchema),
    savedProject: rowWriter(c.savedProject, s.savedProjectSchema),
    job: rowWriter(c.job, s.jobSchema),
  } satisfies Record<Exclude<keyof AppCollectionDefs, "settings">, RowWriter>;
}

export type RestoreResult = RestorePlan & { applied: number };

/**
 * Rolls every row touched after `targetId` back to its state at that event.
 * Writes go through the normal collection API, so they become new events and
 * sync like any edit; nothing in the log is rewritten.
 */
export function restoreToEvent(
  db: AppDb,
  events: readonly HistoryEvent[],
  targetId: string,
): RestoreResult {
  const plan = planRestore(events, targetId);
  const writers: Record<string, RowWriter | undefined> = rowWriters(db);
  const now = Date.now();
  let applied = 0;
  for (const step of plan.steps) {
    const writer = writers[step.collectionId];
    if (!writer) continue;
    if (step.kind === "remove") {
      if (!writer.has(step.key)) continue;
      writer.remove(step.key);
    } else {
      // Other devices skip pulled rows older than their copy, so the restore must look new.
      const row =
        typeof step.row.updatedAt === "number" ? { ...step.row, updatedAt: now } : step.row;
      writer.upsert(step.key, row);
    }
    applied += 1;
  }
  return { ...plan, applied };
}

type RowRef = { collectionId: string; key: string };

export type RevertResult = {
  reverted: number;
  /** Rows changed again after these events; reverting them would lose that edit. */
  skipped: RowRef[];
  /** Rows whose state before these events is no longer recorded. */
  unknown: RowRef[];
};

/** JSON with sorted object keys, so equal rows compare equal regardless of key order. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, nested: unknown) =>
    typeof nested === "object" && nested !== null && !Array.isArray(nested)
      ? Object.fromEntries(Object.entries(nested).sort(([a], [b]) => (a < b ? -1 : 1)))
      : nested,
  );
}

/**
 * Compares only the payload's fields: live rows carry TanStack DB's virtual `$`
 * fields. `updatedAt` is ignored because an earlier undo bumps it without
 * changing content.
 */
function stillMatches(live: Record<string, unknown> | undefined, last: OutboxEntry) {
  if (last.type === "delete") return live === undefined;
  if (!live) return false;
  return Object.entries(last.payload).every(
    ([field, value]) =>
      field === "updatedAt" || canonicalJson(live[field]) === canonicalJson(value),
  );
}

/**
 * Undoes a group of this device's own events (one assistant tool call): each
 * row goes back to its state before the group's first event on it. Rows that
 * no longer match the group's last event were edited since and are skipped.
 * Like `restoreToEvent`, the undo is written as new events.
 */
export function revertOwnEvents(db: AppDb, entries: readonly OutboxEntry[]): RevertResult {
  const writers: Record<string, RowWriter | undefined> = rowWriters(db);
  const byRow = new Map<string, OutboxEntry[]>();
  for (const entry of [...entries].sort((a, b) => a.localSeq - b.localSeq)) {
    const row = rowOf({ collectionId: entry.collectionId, key: String(entry.key) });
    byRow.set(row, [...(byRow.get(row) ?? []), entry]);
  }

  const now = Date.now();
  const result: RevertResult = { reverted: 0, skipped: [], unknown: [] };
  for (const events of byRow.values()) {
    const first = events[0];
    const last = events[events.length - 1];
    const writer = writers[first.collectionId];
    if (!writer) continue;
    const key = String(first.key);
    const ref = { collectionId: first.collectionId, key };
    if (!stillMatches(writer.read(key), last)) {
      result.skipped.push(ref);
      continue;
    }
    if (first.type === "insert") {
      if (writer.has(key)) writer.remove(key);
    } else if (first.previous) {
      const row = first.previous;
      writer.upsert(key, typeof row.updatedAt === "number" ? { ...row, updatedAt: now } : row);
    } else {
      result.unknown.push(ref);
      continue;
    }
    result.reverted += 1;
  }
  return result;
}
