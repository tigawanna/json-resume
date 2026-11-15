/* Creates the browser event-sourced DB: collections, OPFS SQLite persistence, sync transport and guards. */
import { BasicIndex, type Collection } from "@tanstack/db";
import { createBrowserEventSourcedDB } from "event-sourced-collection/browser";
import type { CollectionDef, EventSourcedDB } from "event-sourced-collection";
import type {
  BrowserWASQLitePersistenceOptions,
  OpenBrowserWASQLiteOPFSDatabaseOptions,
} from "@tanstack/browser-db-sqlite-persistence";
import { withOpfsBusyRetry } from "./recovery/opfs-recovery";
import { installStaleReplayGuard } from "@/modules/sync/client/stale-replay-guard";
import { installSyncPushTuning } from "@/modules/sync/client/sync-push-tuning";
import { createCookieSyncTransport } from "@/modules/sync/client/sync-transport";

import type {
  AppSettings,
  Resume,
  ResumeAiChat,
  ResumeAiConversation,
  ResumeAiMessage,
  ResumeCertification,
  ResumeContact,
  ResumeEducation,
  ResumeEducationBullet,
  ResumeExperience,
  ResumeExperienceBullet,
  ResumeLanguage,
  ResumeLink,
  ResumeNote,
  ResumeProject,
  ResumeSkill,
  ResumeSkillGroup,
  ResumeSummary,
  ResumeTalk,
  ResumeVolunteer,
  SavedProject,
  Job,
  CoverLetter,
  ApplicationAnswer,
  AssistantSkill,
} from "./schemas";

/**
 * Collection registry keys match Drizzle table camelCase names 1:1
 * (plus `settings` for local sync prefs). Auth tables are not mirrored.
 */
export type AppCollectionDefs = {
  resume: CollectionDef<Resume, string>;

  resumeExperience: CollectionDef<ResumeExperience, string>;
  resumeExperienceBullet: CollectionDef<ResumeExperienceBullet, string>;

  resumeEducation: CollectionDef<ResumeEducation, string>;
  resumeEducationBullet: CollectionDef<ResumeEducationBullet, string>;

  resumeSkillGroup: CollectionDef<ResumeSkillGroup, string>;
  resumeSkill: CollectionDef<ResumeSkill, string>;

  resumeContact: CollectionDef<ResumeContact, string>;
  resumeProject: CollectionDef<ResumeProject, string>;
  resumeSummary: CollectionDef<ResumeSummary, string>;
  resumeNote: CollectionDef<ResumeNote, string>;
  resumeLink: CollectionDef<ResumeLink, string>;
  resumeLanguage: CollectionDef<ResumeLanguage, string>;
  resumeCertification: CollectionDef<ResumeCertification, string>;
  resumeVolunteer: CollectionDef<ResumeVolunteer, string>;
  resumeTalk: CollectionDef<ResumeTalk, string>;

  resumeAiChat: CollectionDef<ResumeAiChat, string>;
  resumeAiConversation: CollectionDef<ResumeAiConversation, string>;
  resumeAiMessage: CollectionDef<ResumeAiMessage, string>;

  savedProject: CollectionDef<SavedProject, string>;
  job: CollectionDef<Job, string>;
  coverLetter: CollectionDef<CoverLetter, string>;
  applicationAnswer: CollectionDef<ApplicationAnswer, string>;
  assistantSkill: CollectionDef<AssistantSkill, string>;
  settings: CollectionDef<AppSettings, string>;
};

export type AppDb = EventSourcedDB<AppCollectionDefs>;

const byId = <T extends { id: string }>(name = "by-id") => ({
  select: (row: T) => row.id,
  indexType: BasicIndex,
  name,
});

const byUserId = <T extends { userId?: string | null }>(name = "by-user") => ({
  select: (row: T) => row.userId,
  indexType: BasicIndex,
  name,
});

const byResumeId = <T extends { resumeId: string }>(name = "by-resume") => ({
  select: (row: T) => row.resumeId,
  indexType: BasicIndex,
  name,
});

/** List routes `orderBy(updatedAt).limit(n)`; without it TanStack DB loads every row. */
const byUpdatedAt = <T extends { updatedAt: number }>(name = "by-updated") => ({
  select: (row: T) => row.updatedAt,
  indexType: BasicIndex,
  name,
});

/** Dashboard recent résumés: `orderBy(createdAt).limit(n)`. */
const byCreatedAt = <T extends { createdAt: number }>(name = "by-created") => ({
  select: (row: T) => row.createdAt,
  indexType: BasicIndex,
  name,
});

const libraryIndexes = <T extends { id: string; userId?: string | null; updatedAt: number }>() => [
  byId<T>(),
  byUserId<T>(),
  byUpdatedAt<T>(),
];

/**
 * Local-first event-sourced DB.
 * Sync transport is wired but starts disabled. Call `applyManagedSyncGate`
 * after `ensureDb()` once the user session and local settings are known.
 */
export const appCollectionConfigs: AppCollectionDefs = {
    resume: {
      getKey: (row) => row.id,
      indexes: [...libraryIndexes<Resume>(), byCreatedAt<Resume>()],
    },

    resumeExperience: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<ResumeExperience>(),
    },
    resumeExperienceBullet: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeExperienceBullet>(),
        { select: (r) => r.experienceId, indexType: BasicIndex, name: "by-experience" },
        byUpdatedAt<ResumeExperienceBullet>(),
      ],
    },

    resumeEducation: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<ResumeEducation>(),
    },
    resumeEducationBullet: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeEducationBullet>(),
        { select: (r) => r.educationId, indexType: BasicIndex, name: "by-education" },
        byUpdatedAt<ResumeEducationBullet>(),
      ],
    },

    resumeSkillGroup: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<ResumeSkillGroup>(),
    },
    resumeSkill: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<ResumeSkill>(),
    },

    resumeContact: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<ResumeContact>(),
    },

    resumeProject: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<ResumeProject>(),
    },

    resumeSummary: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<ResumeSummary>(),
    },

    resumeNote: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<ResumeNote>(),
    },

    resumeLink: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<ResumeLink>(),
    },

    resumeLanguage: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<ResumeLanguage>(),
    },

    resumeCertification: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<ResumeCertification>(),
    },

    resumeVolunteer: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<ResumeVolunteer>(),
    },

    resumeTalk: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<ResumeTalk>(),
    },

    resumeAiChat: {
      getKey: (row) => row.id,
      localOnly: true,
      indexes: [byId<ResumeAiChat>(), byUserId<ResumeAiChat>(), byResumeId<ResumeAiChat>()],
    },
    resumeAiConversation: {
      getKey: (row) => row.id,
      localOnly: true,
      indexes: [
        byId<ResumeAiConversation>(),
        byUserId<ResumeAiConversation>(),
        byResumeId<ResumeAiConversation>(),
        byUpdatedAt<ResumeAiConversation>(),
      ],
    },
    resumeAiMessage: {
      getKey: (row) => row.id,
      localOnly: true,
      indexes: [
        byId<ResumeAiMessage>(),
        { select: (r) => r.conversationId, indexType: BasicIndex, name: "by-conversation" },
        { select: (r) => r.messageId, indexType: BasicIndex, name: "by-message-id" },
        { select: (r) => r.position, indexType: BasicIndex, name: "by-position" },
      ],
    },

    savedProject: {
      getKey: (row) => row.id,
      indexes: libraryIndexes<SavedProject>(),
    },

    job: {
      getKey: (row) => row.id,
      indexes: [
        byId<Job>(),
        byUserId<Job>(),
        { select: (r) => r.status, indexType: BasicIndex, name: "by-status" },
        byUpdatedAt<Job>(),
      ],
    },

    coverLetter: {
      getKey: (row) => row.id,
      indexes: [
        byId<CoverLetter>(),
        byUserId<CoverLetter>(),
        { select: (r) => r.resumeId, indexType: BasicIndex, name: "by-resume" },
        byUpdatedAt<CoverLetter>(),
      ],
    },

    applicationAnswer: {
      getKey: (row) => row.id,
      indexes: [
        byId<ApplicationAnswer>(),
        byUserId<ApplicationAnswer>(),
        { select: (r) => r.jobId, indexType: BasicIndex, name: "by-job" },
        { select: (r) => r.resumeId, indexType: BasicIndex, name: "by-resume" },
        byUpdatedAt<ApplicationAnswer>(),
      ],
    },

    assistantSkill: {
      getKey: (row) => row.id,
      indexes: [byId<AssistantSkill>(), byUserId<AssistantSkill>(), byUpdatedAt<AssistantSkill>()],
    },

    settings: {
      getKey: (row) => row.id,
      localOnly: true,
    },
};

const {
  ensureDb: ensureDbInner,
  db,
  close: closeInner,
} = createBrowserEventSourcedDB<AppCollectionDefs>({
  databaseName: "agentic-json-resume.sqlite",
  // debug: import.meta.env.DEV,
  debug: false,
  schemaVersion: 1,
  eventSchemaVersion: 1,
  syncEnabled: true,
  recordLocalEchoes: false,
  sync: createCookieSyncTransport(),
  syncPreset: "vercel",
  // A rebuilt server log has no delete events for rows it dropped, so a device
  // must start from an empty database rather than requeue its old outbox.
  // `runManagedSync` wipes and reloads on BackendMismatchError.
  backendMismatch: "fail",
  collections: appCollectionConfigs,

  modules: async () => {
    const { createCollection } = await import("@tanstack/db");
    const {
      BrowserCollectionCoordinator,
      createBrowserWASQLitePersistence,
      openBrowserWASQLiteOPFSDatabase,
      persistedCollectionOptions,
    } = await import("@tanstack/browser-db-sqlite-persistence");

    return {
      createCollection,
      BrowserCollectionCoordinator,
      // Local-only collections default to `sync-absent-error`, which retries
      // forever if OPFS still has a leftover schema version (e.g. `job` from a
      // global schemaVersion bump). Reset the mismatched collection only.
      createBrowserWASQLitePersistence: (options: BrowserWASQLitePersistenceOptions) =>
        createBrowserWASQLitePersistence({
          ...options,
          schemaMismatchPolicy: "reset",
        }),
      openBrowserWASQLiteOPFSDatabase: (options: OpenBrowserWASQLiteOPFSDatabaseOptions) =>
        withOpfsBusyRetry(() => openBrowserWASQLiteOPFSDatabase(options)),
      persistedCollectionOptions,
    };
  },
});

/**
 * Built-in outbox/inbox/deadletter collections are not configurable via the
 * registry `indexes` option. Register the fields used by Events page
 * `orderBy` + `limit` queries, and re-apply after SQLite hydration.
 */
function ensureNamedIndexes<T extends object>(
  collection: Collection<T, string>,
  indexes: Array<{
    name: string;
    select: Parameters<Collection<T, string>["createIndex"]>[0];
  }>,
) {
  const register = () => {
    const names = new Set(collection.getIndexMetadata().map((meta) => meta.name));
    for (const index of indexes) {
      if (names.has(index.name)) continue;
      collection.createIndex(index.select, { name: index.name, indexType: BasicIndex });
      names.add(index.name);
    }
  };
  register();
  collection.on("status:ready", register);
}

let metaQueueIndexesApplied = false;

function ensureMetaQueueIndexes(database: AppDb) {
  if (metaQueueIndexesApplied) return;
  metaQueueIndexesApplied = true;

  ensureNamedIndexes(database.collections.outbox, [
    { name: "by-local-seq", select: (row) => row.localSeq },
    { name: "by-timestamp", select: (row) => row.timestamp },
    { name: "by-type", select: (row) => row.type },
    { name: "by-collection", select: (row) => row.collectionId },
    { name: "by-sync", select: (row) => row.sync },
  ]);

  ensureNamedIndexes(database.collections.inbox, [
    { name: "by-global-seq", select: (row) => row.globalSeq },
    { name: "by-timestamp", select: (row) => row.timestamp },
    { name: "by-type", select: (row) => row.type },
    { name: "by-collection", select: (row) => row.collectionId },
    { name: "by-sync", select: (row) => row.sync },
  ]);

  ensureNamedIndexes(database.collections.deadletter, [
    { name: "by-failed-at", select: (row) => row.failedAt },
    { name: "by-collection", select: (row) => row.collectionId },
    { name: "by-type", select: (row) => row.type },
    { name: "by-reason", select: (row) => row.reason },
  ]);
}

async function ensureDb() {
  const database = await ensureDbInner();
  ensureMetaQueueIndexes(database);
  installStaleReplayGuard(database);
  installSyncPushTuning(database);
  return database;
}

const beforeCloseListeners = new Set<() => void>();
let dbClosing = false;

/** True once `close()` has started and the exported `db` proxy is about to go dead. */
export function isDbClosing() {
  return dbClosing;
}

/** Runs synchronously before the singleton proxy is cleared. */
export function subscribeBeforeDbClose(listener: () => void) {
  beforeCloseListeners.add(listener);
  return () => {
    beforeCloseListeners.delete(listener);
  };
}

async function close() {
  dbClosing = true;
  for (const listener of beforeCloseListeners) listener();
  await closeInner();
}

export { close, db, ensureDb };
export * from "./schemas";
