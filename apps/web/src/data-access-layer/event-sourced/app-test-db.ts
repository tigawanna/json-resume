import { createCollection } from "@tanstack/db";
import {
  createNodeSQLitePersistence,
  persistedCollectionOptions,
} from "@tanstack/node-db-sqlite-persistence";
import { createMockSyncBackend } from "event-sourced-collection";
import { createNodeEventSourcedDB } from "event-sourced-collection/node";
import Database from "better-sqlite3";
import type { AppCollectionDefs, AppDb } from "./collection";

const byId = { getKey: (row: { id: string }) => row.id };

/** Every app collection on an in-memory node database, for tests that need a real `AppDb`. */
export function openTestAppDb() {
  const device = createNodeEventSourcedDB<AppCollectionDefs>({
    clientId: "test-device",
    schemaVersion: 1,
    eventSchemaVersion: 1,
    syncEnabled: false,
    recordLocalEchoes: false,
    sync: createMockSyncBackend({ backendId: "app-test" }),
    collections: {
      resume: byId,
      resumeExperience: byId,
      resumeExperienceBullet: byId,
      resumeEducation: byId,
      resumeEducationBullet: byId,
      resumeSkillGroup: byId,
      resumeSkill: byId,
      resumeContact: byId,
      resumeProject: byId,
      resumeSummary: byId,
      resumeNote: byId,
      resumeLink: byId,
      resumeLanguage: byId,
      resumeCertification: byId,
      resumeVolunteer: byId,
      resumeTalk: byId,
      resumeAiChat: { ...byId, localOnly: true },
      resumeAiConversation: { ...byId, localOnly: true },
      resumeAiMessage: { ...byId, localOnly: true },
      savedProject: byId,
      job: byId,
      settings: { ...byId, localOnly: true },
    },
    modules: {
      database: new Database(":memory:"),
      createNodeSQLitePersistence,
      createCollection,
      persistedCollectionOptions,
    },
  });
  return {
    ensureDb: (): Promise<AppDb> => device.ensureDb(),
    close: () => device.close(),
  };
}
