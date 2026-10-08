import type { OutboxEntry } from "event-sourced-collection";
import { z } from "zod";

import type { AppCollectionDefs, AppDb } from "./collection";
import {
  appSettingsSchema,
  resumeAiChatSchema,
  resumeAiConversationSchema,
  resumeAiMessageSchema,
  resumeCertificationSchema,
  resumeContactSchema,
  resumeEducationBulletSchema,
  resumeEducationSchema,
  resumeExperienceBulletSchema,
  resumeExperienceSchema,
  resumeLanguageSchema,
  resumeLinkSchema,
  resumeNoteSchema,
  resumeProjectSchema,
  resumeSchema,
  resumeSkillGroupSchema,
  resumeSkillSchema,
  resumeSummarySchema,
  resumeTalkSchema,
  resumeVolunteerSchema,
  savedProjectSchema,
} from "./schemas";
import { isLegacyCollectionId, upgradeLegacySnapshot } from "./legacy-backup";

export const LOCAL_BACKUP_FORMAT = "agentic-json-resume-event-backup" as const;
export const LOCAL_BACKUP_FORMAT_VERSION = 1;

const userCollectionIds = [
  "resume",
  "resumeExperience",
  "resumeExperienceBullet",
  "resumeEducation",
  "resumeEducationBullet",
  "resumeSkillGroup",
  "resumeSkill",
  "resumeContact",
  "resumeProject",
  "resumeSummary",
  "resumeNote",
  "resumeLink",
  "resumeLanguage",
  "resumeCertification",
  "resumeVolunteer",
  "resumeTalk",
  "resumeAiChat",
  "resumeAiConversation",
  "resumeAiMessage",
  "savedProject",
  "settings",
] as const satisfies ReadonlyArray<keyof AppCollectionDefs>;

type UserCollectionId = (typeof userCollectionIds)[number];

const userCollectionIdSet = new Set<string>(userCollectionIds);

const rowSchemaByCollection = {
  resume: resumeSchema,
  resumeExperience: resumeExperienceSchema,
  resumeExperienceBullet: resumeExperienceBulletSchema,
  resumeEducation: resumeEducationSchema,
  resumeEducationBullet: resumeEducationBulletSchema,
  resumeSkillGroup: resumeSkillGroupSchema,
  resumeSkill: resumeSkillSchema,
  resumeContact: resumeContactSchema,
  resumeProject: resumeProjectSchema,
  resumeSummary: resumeSummarySchema,
  resumeNote: resumeNoteSchema,
  resumeLink: resumeLinkSchema,
  resumeLanguage: resumeLanguageSchema,
  resumeCertification: resumeCertificationSchema,
  resumeVolunteer: resumeVolunteerSchema,
  resumeTalk: resumeTalkSchema,
  resumeAiChat: resumeAiChatSchema,
  resumeAiConversation: resumeAiConversationSchema,
  resumeAiMessage: resumeAiMessageSchema,
  savedProject: savedProjectSchema,
  settings: appSettingsSchema,
} satisfies Record<UserCollectionId, z.ZodType>;

const backupEventSchema = z.object({
  eventId: z.string(),
  collectionId: z.string(),
  type: z.enum(["insert", "update", "delete"]),
  key: z.union([z.string(), z.number()]),
  payload: z.record(z.string(), z.unknown()),
  previous: z.record(z.string(), z.unknown()).nullable(),
  txId: z.string(),
  clientId: z.string(),
  schemaVersion: z.number(),
  timestamp: z.number(),
  localSeq: z.number(),
});

export const localBackupFileSchema = z.object({
  format: z.literal(LOCAL_BACKUP_FORMAT),
  formatVersion: z.literal(LOCAL_BACKUP_FORMAT_VERSION),
  exportedAt: z.number(),
  databaseName: z.string(),
  eventSchemaVersion: z.number(),
  events: z.array(backupEventSchema),
  collections: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

export type LocalBackupFile = z.infer<typeof localBackupFileSchema>;
export type LocalBackupEvent = z.infer<typeof backupEventSchema>;

export type LocalBackupRestoreStats = {
  applied: number;
  skipped: number;
  failed: number;
};

type MutatingCollection = {
  has: (key: string | number) => boolean;
  toArray: ReadonlyArray<Record<string, unknown>>;
  insert: (row: Record<string, unknown>) => unknown;
  update: (key: string | number, updater: (draft: Record<string, unknown>) => void) => unknown;
  delete: (key: string | number) => unknown;
};

function isUserCollectionId(id: string): id is UserCollectionId {
  return userCollectionIdSet.has(id);
}

function mutatingCollection(db: AppDb, id: UserCollectionId): MutatingCollection {
  return db.collections[id] as unknown as MutatingCollection;
}

function toBackupEvent(entry: OutboxEntry): LocalBackupEvent {
  return {
    eventId: entry.eventId,
    collectionId: entry.collectionId,
    type: entry.type,
    key: entry.key,
    payload: entry.payload,
    previous: entry.previous,
    txId: entry.txId,
    clientId: entry.clientId,
    schemaVersion: entry.schemaVersion,
    timestamp: entry.timestamp,
    localSeq: entry.localSeq,
  };
}

export function buildLocalBackup(db: AppDb): LocalBackupFile {
  const events = [...db.collections.outbox.toArray]
    .sort((a, b) => a.localSeq - b.localSeq || a.timestamp - b.timestamp)
    .map(toBackupEvent);

  const collections: LocalBackupFile["collections"] = {};
  for (const id of userCollectionIds) {
    collections[id] = [...mutatingCollection(db, id).toArray];
  }

  return {
    format: LOCAL_BACKUP_FORMAT,
    formatVersion: LOCAL_BACKUP_FORMAT_VERSION,
    exportedAt: Date.now(),
    databaseName: "agentic-json-resume.sqlite",
    eventSchemaVersion: 1,
    events,
    collections,
  };
}

function parseRow(collectionId: UserCollectionId, payload: Record<string, unknown>) {
  return rowSchemaByCollection[collectionId].parse(payload) as Record<string, unknown>;
}

function applyEvent(db: AppDb, event: LocalBackupEvent): "applied" | "skipped" {
  if (!isUserCollectionId(event.collectionId)) {
    throw new Error(`Unknown collection in backup: ${event.collectionId}`);
  }

  const collection = mutatingCollection(db, event.collectionId);
  const exists = collection.has(event.key);

  if (event.type === "insert") {
    if (exists) return "skipped";
    collection.insert(parseRow(event.collectionId, event.payload));
    return "applied";
  }

  if (event.type === "update") {
    const row = parseRow(event.collectionId, event.payload);
    if (exists) {
      collection.update(event.key, (draft) => {
        Object.assign(draft, row);
      });
    } else {
      collection.insert(row);
    }
    return "applied";
  }

  if (!exists) return "skipped";
  collection.delete(event.key);
  return "applied";
}

function applySnapshotRow(
  db: AppDb,
  collectionId: string,
  payload: Record<string, unknown>,
): "applied" | "skipped" {
  if (!isUserCollectionId(collectionId)) {
    throw new Error(`Unknown collection in backup: ${collectionId}`);
  }
  const collection = mutatingCollection(db, collectionId);
  const row = parseRow(collectionId, payload);
  const key = row.id;
  if (typeof key !== "string" && typeof key !== "number") {
    throw new Error(`Snapshot row in ${collectionId} is missing an id`);
  }
  if (collection.has(key)) return "skipped";
  collection.insert(row);
  return "applied";
}

/** Backups from before `resume.layout` still carry link rows; those restore from the converted snapshot. */
function isLegacyBackup(backup: LocalBackupFile): boolean {
  return (
    backup.events.some((event) => isLegacyCollectionId(event.collectionId)) ||
    Object.keys(backup.collections).some(isLegacyCollectionId)
  );
}

export function restoreLocalBackup(db: AppDb, backup: LocalBackupFile): LocalBackupRestoreStats {
  const stats: LocalBackupRestoreStats = { applied: 0, skipped: 0, failed: 0 };
  const legacy = isLegacyBackup(backup);

  if (backup.events.length > 0 && !legacy) {
    for (const event of backup.events) {
      try {
        const result = applyEvent(db, event);
        if (result === "applied") stats.applied += 1;
        else stats.skipped += 1;
      } catch (err: unknown) {
        stats.failed += 1;
        console.error("[local backup] event restore failed", event, err);
      }
    }
    return stats;
  }

  const collections = legacy ? upgradeLegacySnapshot(backup.collections) : backup.collections;
  for (const [collectionId, rows] of Object.entries(collections)) {
    for (const row of rows) {
      try {
        const result = applySnapshotRow(db, collectionId, row);
        if (result === "applied") stats.applied += 1;
        else stats.skipped += 1;
      } catch (err: unknown) {
        stats.failed += 1;
        console.error("[local backup] snapshot restore failed", { collectionId, row }, err);
      }
    }
  }

  return stats;
}

export function parseLocalBackupJson(text: string): LocalBackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Backup file is not valid JSON");
  }
  return localBackupFileSchema.parse(parsed);
}

export function backupDownloadFilename(exportedAt: number): string {
  const day = new Date(exportedAt).toISOString().slice(0, 10);
  return `agentic-json-resume-backup-${day}.json`;
}
