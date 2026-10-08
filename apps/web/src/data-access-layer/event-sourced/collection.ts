import { BasicIndex, type Collection } from "@tanstack/db";
import { createBrowserEventSourcedDB } from "event-sourced-collection/browser";
import type { CollectionDef, EventSourcedDB } from "event-sourced-collection";
import type {
  BrowserWASQLitePersistenceOptions,
  OpenBrowserWASQLiteOPFSDatabaseOptions,
} from "@tanstack/browser-db-sqlite-persistence";
import { withOpfsBusyRetry } from "./opfs-recovery";
import { installStaleReplayGuard } from "./stale-replay-guard";
import { installSyncPushTuning } from "./sync-push-tuning";
import { createCookieSyncTransport } from "./sync-transport";

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

/**
 * Local-first event-sourced DB.
 * Sync transport is wired but starts disabled. Call `applyManagedSyncGate`
 * after `ensureDb()` once the user session and local settings are known.
 */
const {
  ensureDb: ensureDbInner,
  db,
  close,
} = createBrowserEventSourcedDB<AppCollectionDefs>({
  databaseName: "agentic-json-resume.sqlite",
  debug: import.meta.env.DEV,
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

  collections: {
    resume: {
      getKey: (row) => row.id,
      indexes: [
        byId<Resume>(),
        byUserId<Resume>(),
        { select: (r) => r.updatedAt, indexType: BasicIndex, name: "by-updated" },
      ],
    },

    resumeExperience: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeExperience>(), byUserId<ResumeExperience>()],
    },
    resumeExperienceBullet: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeExperienceBullet>(),
        { select: (r) => r.experienceId, indexType: BasicIndex, name: "by-experience" },
      ],
    },

    resumeEducation: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeEducation>(), byUserId<ResumeEducation>()],
    },
    resumeEducationBullet: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeEducationBullet>(),
        { select: (r) => r.educationId, indexType: BasicIndex, name: "by-education" },
      ],
    },

    resumeSkillGroup: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeSkillGroup>(), byUserId<ResumeSkillGroup>()],
    },
    resumeSkill: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeSkill>(), byUserId<ResumeSkill>()],
    },

    resumeContact: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeContact>(), byUserId<ResumeContact>()],
    },

    resumeProject: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeProject>(), byUserId<ResumeProject>()],
    },

    resumeSummary: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeSummary>(), byUserId<ResumeSummary>()],
    },

    resumeNote: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeNote>(), byUserId<ResumeNote>()],
    },

    resumeLink: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeLink>(), byUserId<ResumeLink>()],
    },

    resumeLanguage: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeLanguage>(), byUserId<ResumeLanguage>()],
    },

    resumeCertification: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeCertification>(), byUserId<ResumeCertification>()],
    },

    resumeVolunteer: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeVolunteer>(), byUserId<ResumeVolunteer>()],
    },

    resumeTalk: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeTalk>(), byUserId<ResumeTalk>()],
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
        { select: (r) => r.updatedAt, indexType: BasicIndex, name: "by-updated" },
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
      indexes: [
        byId<SavedProject>(),
        byUserId<SavedProject>(),
        { select: (r) => r.updatedAt, indexType: BasicIndex, name: "by-updated" },
      ],
    },

    job: {
      getKey: (row) => row.id,
      indexes: [
        byId<Job>(),
        byUserId<Job>(),
        { select: (r) => r.status, indexType: BasicIndex, name: "by-status" },
        { select: (r) => r.updatedAt, indexType: BasicIndex, name: "by-updated" },
      ],
    },

    settings: {
      getKey: (row) => row.id,
      localOnly: true,
    },
  },

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
function applyIndexes<T extends object>(
  collection: Collection<T, string>,
  registerIndexes: (collection: Collection<T, string>) => void,
) {
  const register = () => {
    if (collection.getIndexMetadata().length > 0) return;
    registerIndexes(collection);
  };
  register();
  collection.on("status:ready", register);
}

let metaQueueIndexesApplied = false;

function ensureMetaQueueIndexes(database: AppDb) {
  if (metaQueueIndexesApplied) return;
  metaQueueIndexesApplied = true;

  applyIndexes(database.collections.outbox, (collection) => {
    collection.createIndex((r) => r.localSeq, { name: "by-local-seq", indexType: BasicIndex });
    collection.createIndex((r) => r.timestamp, { name: "by-timestamp", indexType: BasicIndex });
    collection.createIndex((r) => r.type, { name: "by-type", indexType: BasicIndex });
    collection.createIndex((r) => r.collectionId, { name: "by-collection", indexType: BasicIndex });
    collection.createIndex((r) => r.sync, { name: "by-sync", indexType: BasicIndex });
  });

  applyIndexes(database.collections.inbox, (collection) => {
    collection.createIndex((r) => r.globalSeq, { name: "by-global-seq", indexType: BasicIndex });
    collection.createIndex((r) => r.timestamp, { name: "by-timestamp", indexType: BasicIndex });
    collection.createIndex((r) => r.type, { name: "by-type", indexType: BasicIndex });
    collection.createIndex((r) => r.collectionId, { name: "by-collection", indexType: BasicIndex });
    collection.createIndex((r) => r.sync, { name: "by-sync", indexType: BasicIndex });
  });

  applyIndexes(database.collections.deadletter, (collection) => {
    collection.createIndex((r) => r.failedAt, { name: "by-failed-at", indexType: BasicIndex });
    collection.createIndex((r) => r.collectionId, { name: "by-collection", indexType: BasicIndex });
    collection.createIndex((r) => r.type, { name: "by-type", indexType: BasicIndex });
    collection.createIndex((r) => r.reason, { name: "by-reason", indexType: BasicIndex });
  });
}

async function ensureDb() {
  const database = await ensureDbInner();
  ensureMetaQueueIndexes(database);
  installStaleReplayGuard(database);
  installSyncPushTuning(database);
  return database;
}

export { close, db, ensureDb };
export * from "./schemas";
