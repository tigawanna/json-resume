import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import { unwrapUnknownError } from "@/utils/errors";
import {
  resume,
  resumeAiChat,
  resumeAiConversation,
  resumeAiMessage,
  resumeCertification,
  resumeCertificationItem,
  resumeContact,
  resumeContactItem,
  resumeEducation,
  resumeEducationBullet,
  resumeEducationItem,
  resumeExperience,
  resumeExperienceBullet,
  resumeExperienceBulletItem,
  resumeExperienceItem,
  job,
  resumeLanguage,
  resumeLanguageItem,
  resumeLink,
  resumeLinkItem,
  resumeNote,
  resumeNoteItem,
  resumeProject,
  resumeProjectItem,
  resumeSection,
  resumeSkill,
  resumeSkillGroup,
  resumeSkillGroupItem,
  resumeSkillGroupSkill,
  resumeSummary,
  resumeSummaryItem,
  resumeTalk,
  resumeTalkItem,
  resumeVolunteer,
  resumeVolunteerItem,
  savedProject,
  syncBackend,
  syncEvent,
} from "@/lib/drizzle/scheam";
import { and, eq, getTableColumns, isNull, type SQL } from "drizzle-orm";
import { log as standaloneLog, type RequestLogger } from "evlog";
import { useRequest } from "nitro/context";
import { isForeignKeyError, uniqueConstraintColumns } from "./projection-constraint";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

const SKIP_COLLECTIONS = new Set(["settings"]);
const PROJECTION_FAILURE_SAMPLE = 20;

type ProjectionFailure = {
  globalSeq: number;
  collectionId: string;
  type: string;
  key: string;
  reason: string;
};

function requestLog(): RequestLogger | null {
  try {
    const candidate = useRequest().context?.log;
    if (
      candidate &&
      typeof candidate === "object" &&
      "warn" in candidate &&
      "set" in candidate &&
      typeof candidate.warn === "function" &&
      typeof candidate.set === "function"
    ) {
      return candidate as RequestLogger;
    }
  } catch {
    // Projection can run without a Nitro request context.
  }
  return null;
}

function recordProjection(fields: {
  pending: number;
  projected: number;
  failed: number;
  deferred: number;
  lastSeq: number | null;
  durationMs: number;
  failures: ProjectionFailure[];
}) {
  const syncProjection = {
    pending: fields.pending,
    projected: fields.projected,
    failed: fields.failed,
    deferred: fields.deferred,
    lastSeq: fields.lastSeq,
    durationMs: fields.durationMs,
    failures: fields.failures.slice(0, PROJECTION_FAILURE_SAMPLE),
  };
  const message =
    fields.failed > 0 ? "Sync projection finished with failures" : "Sync projection finished";
  const current = requestLog();
  if (current) {
    current.set({ syncProjection });
    if (fields.failed > 0) current.warn(message);
    return;
  }
  const event = { message, service: "agentic-json-resume", syncProjection };
  if (fields.failed > 0) standaloneLog.warn(event);
  else standaloneLog.info(event);
}

export const tablesByCollection = {
  resume,
  resumeSection,
  resumeExperience,
  resumeExperienceItem,
  resumeExperienceBullet,
  resumeExperienceBulletItem,
  resumeEducation,
  resumeEducationItem,
  resumeEducationBullet,
  resumeSkillGroup,
  resumeSkillGroupItem,
  resumeSkill,
  resumeSkillGroupSkill,
  resumeContact,
  resumeContactItem,
  resumeProject,
  resumeProjectItem,
  resumeSummary,
  resumeSummaryItem,
  resumeNote,
  resumeNoteItem,
  resumeLink,
  resumeLinkItem,
  resumeLanguage,
  resumeLanguageItem,
  resumeCertification,
  resumeCertificationItem,
  resumeVolunteer,
  resumeVolunteerItem,
  resumeTalk,
  resumeTalkItem,
  resumeAiChat,
  resumeAiConversation,
  resumeAiMessage,
  savedProject,
  job,
} satisfies Record<string, SQLiteTable>;

export type ProjectableCollectionId = keyof typeof tablesByCollection;

export function isProjectableCollectionId(id: string): id is ProjectableCollectionId {
  return id in tablesByCollection;
}

function parsePayload(raw: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw);
  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Event payload is not an object");
  }
  return parsed as Record<string, unknown>;
}

function coerceColumnValue(columnName: string, value: unknown): unknown {
  if (columnName === "createdAt" || columnName === "updatedAt") {
    if (typeof value === "number") return new Date(value);
    if (value instanceof Date) return value;
  }
  return value;
}

function columnValue(column: SQLiteColumn, value: unknown): SQL {
  return eq(column, value as never);
}

/**
 * Insert or replace by primary key. A second unique index (one link row per
 * résumé plus experience, for example) does not match `onConflictDoUpdate`
 * on `id`, so the conflicting row is removed and the event's id is written.
 */
async function upsertById(
  table: SQLiteTable,
  idColumn: SQLiteColumn,
  values: Record<string, unknown>,
): Promise<void> {
  const write = () =>
    db
      .insert(table)
      .values(values as never)
      .onConflictDoUpdate({
        target: idColumn,
        set: values as never,
      });

  try {
    await write();
  } catch (err: unknown) {
    const sqlNames = uniqueConstraintColumns(err);
    if (sqlNames == null) throw err;
    const columns = getTableColumns(table);
    const predicates: SQL[] = [];
    for (const sqlName of sqlNames) {
      const entry = Object.entries(columns).find(([, column]) => column.name === sqlName);
      if (!entry) throw err;
      const [jsName, column] = entry;
      if (!(jsName in values)) throw err;
      predicates.push(columnValue(column, values[jsName]));
    }
    if (predicates.length === 0) throw err;
    await db.delete(table).where(and(...predicates));
    await write();
  }
}

function rowValuesForTable(
  table: SQLiteTable,
  payload: Record<string, unknown>,
  ownerUserId: string,
): Record<string, unknown> {
  const columns = getTableColumns(table);
  const row: Record<string, unknown> = {};
  for (const columnName of Object.keys(columns)) {
    if (columnName === "embedding") continue;
    if (columnName in payload) {
      row[columnName] = coerceColumnValue(columnName, payload[columnName]);
    }
  }
  if ("userId" in columns) {
    row.userId = ownerUserId;
  }
  return row;
}

async function applyEvent(row: typeof syncEvent.$inferSelect): Promise<void> {
  if (SKIP_COLLECTIONS.has(row.collectionId)) return;
  if (!isProjectableCollectionId(row.collectionId)) {
    const current = requestLog();
    const skipped = { globalSeq: row.globalSeq, collectionId: row.collectionId };
    if (current) current.set({ syncProjectionSkipped: [skipped] });
    else
      standaloneLog.info({
        message: "Skipped unprojected collection",
        service: "agentic-json-resume",
        ...skipped,
      });
    return;
  }

  const table = tablesByCollection[row.collectionId];
  const columns = getTableColumns(table);
  const idColumn = columns.id;
  if (!idColumn) throw new Error(`Table ${row.collectionId} has no id column`);

  if (row.type === "delete") {
    await db.delete(table).where(eq(idColumn, row.key));
    return;
  }

  const payload = parsePayload(row.payload);
  const values = rowValuesForTable(table, payload, row.userId);
  values.id = row.key;

  if (row.type === "insert") {
    await upsertById(table, idColumn, values);
    return;
  }

  const existing = await db
    .select({ id: idColumn })
    .from(table)
    .where(eq(idColumn, row.key))
    .limit(1);
  if (existing.length === 0) {
    await upsertById(table, idColumn, values);
    return;
  }
  await db
    .update(table)
    .set(values as never)
    .where(eq(idColumn, row.key));
}

export type ProjectLegacyResult = {
  projected: number;
  failed: number;
  lastSeq: number | null;
};

type SyncEventRow = typeof syncEvent.$inferSelect;

async function stampProjected(event: SyncEventRow, lastSeq: number | null): Promise<number> {
  const now = new Date();
  await db
    .update(syncEvent)
    .set({ projectedAt: now })
    .where(eq(syncEvent.globalSeq, event.globalSeq));
  const next = lastSeq == null || event.globalSeq > lastSeq ? event.globalSeq : lastSeq;
  if (next !== lastSeq) {
    await db.update(syncBackend).set({ lastProjectedSeq: next }).where(eq(syncBackend.id, 1));
  }
  return next;
}

function failureFrom(event: SyncEventRow, err: unknown): ProjectionFailure {
  return {
    globalSeq: event.globalSeq,
    collectionId: event.collectionId,
    type: event.type,
    key: event.key,
    reason: unwrapUnknownError(err).message,
  };
}

async function projectOne(
  event: SyncEventRow,
): Promise<{ outcome: "ok" | "foreign-key" | "failed"; failure?: ProjectionFailure }> {
  try {
    await applyEvent(event);
    return { outcome: "ok" };
  } catch (err: unknown) {
    if (isForeignKeyError(err)) return { outcome: "foreign-key", failure: failureFrom(event, err) };
    return { outcome: "failed", failure: failureFrom(event, err) };
  }
}

export async function projectUnappliedSyncEvents(limit = 100): Promise<ProjectLegacyResult> {
  const pending = await db
    .select()
    .from(syncEvent)
    .where(isNull(syncEvent.projectedAt))
    .orderBy(syncEvent.globalSeq)
    .limit(limit);

  let projected = 0;
  let failed = 0;
  let lastSeq: number | null = null;
  const deferred: SyncEventRow[] = [];
  const failures: ProjectionFailure[] = [];
  const started = Date.now();

  for (const event of pending) {
    const result = await projectOne(event);
    if (result.outcome === "foreign-key") {
      deferred.push(event);
      continue;
    }
    lastSeq = await stampProjected(event, lastSeq);
    if (result.outcome === "ok") projected += 1;
    else {
      failed += 1;
      if (result.failure) failures.push(result.failure);
    }
  }

  // A child row can sit before its parent in this batch. Apply those again
  // after the rest of the batch, then stamp them either way so one missing
  // parent cannot pin the queue.
  for (const event of deferred) {
    const result = await projectOne(event);
    lastSeq = await stampProjected(event, lastSeq);
    if (result.outcome === "ok") projected += 1;
    else {
      failed += 1;
      if (result.failure) failures.push(result.failure);
    }
  }

  recordProjection({
    pending: pending.length,
    projected,
    failed,
    deferred: deferred.length,
    lastSeq,
    durationMs: Date.now() - started,
    failures,
  });

  return { projected, failed, lastSeq };
}
