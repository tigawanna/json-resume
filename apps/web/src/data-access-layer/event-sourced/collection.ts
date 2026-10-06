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
  ResumeCertificationItem,
  ResumeContact,
  ResumeContactItem,
  ResumeEducation,
  ResumeEducationBullet,
  ResumeEducationItem,
  ResumeExperience,
  ResumeExperienceBullet,
  ResumeExperienceItem,
  ResumeLanguage,
  ResumeLanguageItem,
  ResumeLink,
  ResumeLinkItem,
  ResumeNote,
  ResumeNoteItem,
  ResumeProject,
  ResumeProjectItem,
  ResumeSection,
  ResumeSkill,
  ResumeSkillGroup,
  ResumeSkillGroupItem,
  ResumeSummary,
  ResumeSummaryItem,
  ResumeTalk,
  ResumeTalkItem,
  ResumeVolunteer,
  ResumeVolunteerItem,
  SavedProject,
  Job,
} from "./schemas";

/**
 * Collection registry keys match Drizzle table camelCase names 1:1
 * (plus `settings` for local sync prefs). Auth tables are not mirrored.
 */
export type AppCollectionDefs = {
  resume: CollectionDef<Resume, string>;
  resumeSection: CollectionDef<ResumeSection, string>;

  resumeExperience: CollectionDef<ResumeExperience, string>;
  resumeExperienceItem: CollectionDef<ResumeExperienceItem, string>;
  resumeExperienceBullet: CollectionDef<ResumeExperienceBullet, string>;

  resumeEducation: CollectionDef<ResumeEducation, string>;
  resumeEducationItem: CollectionDef<ResumeEducationItem, string>;
  resumeEducationBullet: CollectionDef<ResumeEducationBullet, string>;

  resumeSkillGroup: CollectionDef<ResumeSkillGroup, string>;
  resumeSkillGroupItem: CollectionDef<ResumeSkillGroupItem, string>;
  resumeSkill: CollectionDef<ResumeSkill, string>;

  resumeContact: CollectionDef<ResumeContact, string>;
  resumeContactItem: CollectionDef<ResumeContactItem, string>;

  resumeProject: CollectionDef<ResumeProject, string>;
  resumeProjectItem: CollectionDef<ResumeProjectItem, string>;

  resumeSummary: CollectionDef<ResumeSummary, string>;
  resumeSummaryItem: CollectionDef<ResumeSummaryItem, string>;

  resumeNote: CollectionDef<ResumeNote, string>;
  resumeNoteItem: CollectionDef<ResumeNoteItem, string>;

  resumeLink: CollectionDef<ResumeLink, string>;
  resumeLinkItem: CollectionDef<ResumeLinkItem, string>;

  resumeLanguage: CollectionDef<ResumeLanguage, string>;
  resumeLanguageItem: CollectionDef<ResumeLanguageItem, string>;

  resumeCertification: CollectionDef<ResumeCertification, string>;
  resumeCertificationItem: CollectionDef<ResumeCertificationItem, string>;

  resumeVolunteer: CollectionDef<ResumeVolunteer, string>;
  resumeVolunteerItem: CollectionDef<ResumeVolunteerItem, string>;

  resumeTalk: CollectionDef<ResumeTalk, string>;
  resumeTalkItem: CollectionDef<ResumeTalkItem, string>;

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

  collections: {
    resume: {
      getKey: (row) => row.id,
      indexes: [
        byId<Resume>(),
        byUserId<Resume>(),
        { select: (r) => r.updatedAt, indexType: BasicIndex, name: "by-updated" },
      ],
    },
    resumeSection: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeSection>(),
        byResumeId<ResumeSection>(),
        { select: (r) => r.key, indexType: BasicIndex, name: "by-key" },
      ],
    },

    resumeExperience: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeExperience>(), byUserId<ResumeExperience>()],
    },
    resumeExperienceItem: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeExperienceItem>(),
        byResumeId<ResumeExperienceItem>(),
        { select: (r) => r.experienceId, indexType: BasicIndex, name: "by-experience" },
      ],
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
    resumeEducationItem: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeEducationItem>(),
        byResumeId<ResumeEducationItem>(),
        { select: (r) => r.educationId, indexType: BasicIndex, name: "by-education" },
      ],
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
    resumeSkillGroupItem: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeSkillGroupItem>(),
        byResumeId<ResumeSkillGroupItem>(),
        { select: (r) => r.groupId, indexType: BasicIndex, name: "by-group" },
      ],
    },
    resumeSkill: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeSkill>(),
        { select: (r) => r.groupId, indexType: BasicIndex, name: "by-group" },
      ],
    },

    resumeContact: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeContact>(), byUserId<ResumeContact>()],
    },
    resumeContactItem: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeContactItem>(),
        byResumeId<ResumeContactItem>(),
        { select: (r) => r.contactId, indexType: BasicIndex, name: "by-contact" },
      ],
    },

    resumeProject: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeProject>(), byUserId<ResumeProject>()],
    },
    resumeProjectItem: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeProjectItem>(),
        byResumeId<ResumeProjectItem>(),
        { select: (r) => r.projectId, indexType: BasicIndex, name: "by-project" },
      ],
    },

    resumeSummary: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeSummary>(), byUserId<ResumeSummary>()],
    },
    resumeSummaryItem: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeSummaryItem>(),
        byResumeId<ResumeSummaryItem>(),
        { select: (r) => r.summaryId, indexType: BasicIndex, name: "by-summary" },
      ],
    },

    resumeNote: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeNote>(), byUserId<ResumeNote>()],
    },
    resumeNoteItem: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeNoteItem>(),
        byResumeId<ResumeNoteItem>(),
        { select: (r) => r.noteId, indexType: BasicIndex, name: "by-note" },
      ],
    },

    resumeLink: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeLink>(), byUserId<ResumeLink>()],
    },
    resumeLinkItem: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeLinkItem>(),
        byResumeId<ResumeLinkItem>(),
        { select: (r) => r.linkId, indexType: BasicIndex, name: "by-link" },
      ],
    },

    resumeLanguage: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeLanguage>(), byUserId<ResumeLanguage>()],
    },
    resumeLanguageItem: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeLanguageItem>(),
        byResumeId<ResumeLanguageItem>(),
        { select: (r) => r.languageId, indexType: BasicIndex, name: "by-language" },
      ],
    },

    resumeCertification: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeCertification>(), byUserId<ResumeCertification>()],
    },
    resumeCertificationItem: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeCertificationItem>(),
        byResumeId<ResumeCertificationItem>(),
        { select: (r) => r.certificationId, indexType: BasicIndex, name: "by-certification" },
      ],
    },

    resumeVolunteer: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeVolunteer>(), byUserId<ResumeVolunteer>()],
    },
    resumeVolunteerItem: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeVolunteerItem>(),
        byResumeId<ResumeVolunteerItem>(),
        { select: (r) => r.volunteerId, indexType: BasicIndex, name: "by-volunteer" },
      ],
    },

    resumeTalk: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeTalk>(), byUserId<ResumeTalk>()],
    },
    resumeTalkItem: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeTalkItem>(),
        byResumeId<ResumeTalkItem>(),
        { select: (r) => r.talkId, indexType: BasicIndex, name: "by-talk" },
      ],
    },

    resumeAiChat: {
      getKey: (row) => row.id,
      indexes: [byId<ResumeAiChat>(), byUserId<ResumeAiChat>(), byResumeId<ResumeAiChat>()],
    },
    resumeAiConversation: {
      getKey: (row) => row.id,
      indexes: [
        byId<ResumeAiConversation>(),
        byUserId<ResumeAiConversation>(),
        byResumeId<ResumeAiConversation>(),
        { select: (r) => r.updatedAt, indexType: BasicIndex, name: "by-updated" },
      ],
    },
    resumeAiMessage: {
      getKey: (row) => row.id,
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
