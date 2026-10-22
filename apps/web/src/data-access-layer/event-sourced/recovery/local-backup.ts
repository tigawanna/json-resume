/* Exports and re-imports a snapshot of every app collection. */
import { z } from "zod";

import type { AppCollectionDefs, AppDb } from "../collection";
import {
  applicationAnswerSchema,
  appSettingsSchema,
  coverLetterSchema,
  jobSchema,
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
} from "../schemas";
import { isLegacyCollectionId, upgradeLegacySnapshot } from "./legacy-backup";

export const LOCAL_BACKUP_FORMAT = "agentic-json-resume-event-backup" as const;
export const LOCAL_BACKUP_FORMAT_VERSION = 1;

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
  job: jobSchema,
  coverLetter: coverLetterSchema,
  applicationAnswer: applicationAnswerSchema,
  settings: appSettingsSchema,
} satisfies Record<keyof AppCollectionDefs, z.ZodType>;

type UserCollectionId = keyof typeof rowSchemaByCollection;

const userCollectionIds = Object.keys(rowSchemaByCollection) as UserCollectionId[];

const userCollectionIdSet = new Set<string>(userCollectionIds);

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

export function buildLocalBackup(db: AppDb): LocalBackupFile {
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
    events: [],
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

function recordRestoreResult(stats: LocalBackupRestoreStats, result: "applied" | "skipped") {
  if (result === "applied") stats.applied += 1;
  else stats.skipped += 1;
}

/** Older exports stored some collections only in the outbox. Replay those, in order. */
function eventsMissingFromSnapshot(backup: LocalBackupFile): LocalBackupEvent[] {
  const snapshotted = new Set(Object.keys(backup.collections));
  return [...backup.events]
    .filter((event) => !snapshotted.has(event.collectionId))
    .sort((a, b) => a.localSeq - b.localSeq || a.timestamp - b.timestamp);
}

export function restoreLocalBackup(db: AppDb, backup: LocalBackupFile): LocalBackupRestoreStats {
  const stats: LocalBackupRestoreStats = { applied: 0, skipped: 0, failed: 0 };
  const legacy = isLegacyBackup(backup);
  const collections = legacy ? upgradeLegacySnapshot(backup.collections) : backup.collections;

  for (const [collectionId, rows] of Object.entries(collections)) {
    for (const row of rows) {
      try {
        recordRestoreResult(stats, applySnapshotRow(db, collectionId, row));
      } catch (err: unknown) {
        stats.failed += 1;
        console.error("[local backup] snapshot restore failed", { collectionId, row }, err);
      }
    }
  }

  if (!legacy) {
    for (const event of eventsMissingFromSnapshot(backup)) {
      try {
        recordRestoreResult(stats, applyEvent(db, event));
      } catch (err: unknown) {
        stats.failed += 1;
        console.error("[local backup] event restore failed", event, err);
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
