import "@tanstack/react-start/server-only";

import { db } from "@/lib/drizzle/client";
import {
  resume,
  resumeAiConversation,
  resumeEducation,
  resumeExperience,
  resumeSkillGroup,
  syncEvent,
  user,
} from "@/lib/drizzle/scheam";
import { count, eq, getTableColumns, inArray, type SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import {
  isProjectableCollectionId,
  projectUnappliedSyncEvents,
  tablesByCollection,
  type ProjectableCollectionId,
} from "../sync/project-legacy.server";
import { LOCAL_ONLY_COLLECTIONS } from "../sync/sync-events.server";
import { SYNC_RESET_COLLECTION } from "../sync/sync-reset";

const REBUILD_CLIENT_ID = "server-rebuild";
const INSERT_CHUNK = 50;
const MAX_PROJECTION_ROUNDS = 50;

/** Tables with neither `user_id` nor `resume_id`, owned through a parent that has `user_id`. */
const ownedViaParent: Partial<
  Record<ProjectableCollectionId, { column: string; parent: SQLiteTable }>
> = {
  resumeExperienceBullet: { column: "experienceId", parent: resumeExperience },
  resumeEducationBullet: { column: "educationId", parent: resumeEducation },
  resumeSkill: { column: "groupId", parent: resumeSkillGroup },
  resumeAiMessage: { column: "conversationId", parent: resumeAiConversation },
};

/** `resume.<field>` order arrays are client-only; rebuild them from junction `sortOrder`. */
const resumeOrderSources = {
  experienceOrder: { collection: "resumeExperienceItem", entity: "experienceId" },
  educationOrder: { collection: "resumeEducationItem", entity: "educationId" },
  projectOrder: { collection: "resumeProjectItem", entity: "projectId" },
  talkOrder: { collection: "resumeTalkItem", entity: "talkId" },
} satisfies Record<string, { collection: ProjectableCollectionId; entity: string }>;

type Row = Record<string, unknown>;

function ownerFilter(collectionId: ProjectableCollectionId, userId: string): SQL {
  const columns: Record<string, SQLiteColumn> = getTableColumns(tablesByCollection[collectionId]);
  if (columns.userId) return eq(columns.userId, userId);
  if (columns.resumeId) {
    return inArray(
      columns.resumeId,
      db.select({ id: resume.id }).from(resume).where(eq(resume.userId, userId)),
    );
  }
  const via = ownedViaParent[collectionId];
  const viaColumn = via ? columns[via.column] : undefined;
  if (via && viaColumn) {
    const parentColumns: Record<string, SQLiteColumn> = getTableColumns(via.parent);
    if (parentColumns.id && parentColumns.userId) {
      return inArray(
        viaColumn,
        db
          .select({ id: parentColumns.id })
          .from(via.parent)
          .where(eq(parentColumns.userId, userId)),
      );
    }
  }
  throw new Error(`No ownership path for ${collectionId}`);
}

/** Same shape the client writes: epoch ms timestamps, no embedding blobs. */
function toPayload(row: Row): Row {
  const payload: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "embedding") {
      payload[key] = null;
      continue;
    }
    payload[key] = value instanceof Date ? value.getTime() : value;
  }
  return payload;
}

function orderedEntityIds(rows: Row[] | undefined, resumeId: unknown, entity: string): string[] {
  return (rows ?? [])
    .filter((row) => row.resumeId === resumeId)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .map((row) => String(row[entity]));
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function catchUpProjection(): Promise<number> {
  let projected = 0;
  for (let round = 0; round < MAX_PROJECTION_ROUNDS; round++) {
    const result = await projectUnappliedSyncEvents(500);
    projected += result.projected + result.failed;
    if (result.projected + result.failed === 0) break;
  }
  return projected;
}

export type RebuildEventLogResult = {
  previousEvents: number;
  insertedEvents: number;
  projectedFirst: number;
  byCollection: Record<string, number>;
};

/**
 * Replaces a user's sync events with one `insert` per row they own in the
 * projected tables. Pending events are projected first so nothing pushed but
 * not yet applied is lost. A marker event changes the user's `backendId`, which
 * makes each of their devices wipe its local copy and pull the new log.
 */
export async function rebuildUserEventLog(userId: string): Promise<RebuildEventLogResult> {
  const projectedFirst = await catchUpProjection();

  const rowsByCollection = new Map<ProjectableCollectionId, Row[]>();
  for (const collectionId of Object.keys(tablesByCollection)) {
    if (!isProjectableCollectionId(collectionId)) continue;
    if (LOCAL_ONLY_COLLECTIONS.includes(collectionId)) continue;
    const table = tablesByCollection[collectionId];
    const rows: Row[] = await db.select().from(table).where(ownerFilter(collectionId, userId));
    rowsByCollection.set(collectionId, rows);
  }

  for (const row of rowsByCollection.get("resume") ?? []) {
    for (const [field, source] of Object.entries(resumeOrderSources)) {
      row[field] = orderedEntityIds(rowsByCollection.get(source.collection), row.id, source.entity);
    }
  }

  const now = new Date();
  const txId = `rebuild-${crypto.randomUUID()}`;
  const byCollection: Record<string, number> = {};
  const values: (typeof syncEvent.$inferInsert)[] = [];

  for (const [collectionId, rows] of rowsByCollection) {
    byCollection[collectionId] = rows.length;
    for (const row of rows) {
      const payload = toPayload(row);
      const updatedAt = payload.updatedAt;
      values.push({
        eventId: crypto.randomUUID(),
        userId,
        collectionId,
        type: "insert",
        key: String(row.id),
        payload: JSON.stringify(payload),
        previous: null,
        txId,
        clientId: REBUILD_CLIENT_ID,
        schemaVersion: 1,
        clientTimestamp: typeof updatedAt === "number" ? updatedAt : now.getTime(),
        projectedAt: now,
      });
    }
  }

  const [previous] = await db
    .select({ n: count() })
    .from(syncEvent)
    .where(eq(syncEvent.userId, userId));

  const marker: typeof syncEvent.$inferInsert = {
    eventId: crypto.randomUUID(),
    userId,
    collectionId: SYNC_RESET_COLLECTION,
    type: "insert",
    key: userId,
    payload: JSON.stringify({ rebuiltAt: now.getTime(), events: values.length }),
    previous: null,
    txId,
    clientId: REBUILD_CLIENT_ID,
    schemaVersion: 1,
    clientTimestamp: now.getTime(),
    projectedAt: now,
  };

  // One batch is one transaction: the old log is only gone if the new one landed.
  await db.batch([
    db.delete(syncEvent).where(eq(syncEvent.userId, userId)),
    ...chunk(values, INSERT_CHUNK).map((rows) => db.insert(syncEvent).values(rows)),
    db.insert(syncEvent).values(marker),
  ]);

  return {
    previousEvents: previous?.n ?? 0,
    insertedEvents: values.length,
    projectedFirst,
    byCollection,
  };
}

export async function listUsersWithEventCounts() {
  const users = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .orderBy(user.name);
  const counts = await db
    .select({ userId: syncEvent.userId, events: count() })
    .from(syncEvent)
    .groupBy(syncEvent.userId);
  const byUser = new Map(counts.map((row) => [row.userId, row.events]));
  return users.map((row) => ({ ...row, events: byUser.get(row.id) ?? 0 }));
}
