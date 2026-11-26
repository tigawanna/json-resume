import { applicationAnswer } from '@repo/db/schema/application-answer-schema';
import { assistantSkill } from '@repo/db/schema/assistant-skill-schema';
import { coverLetter } from '@repo/db/schema/cover-letter-schema';
import { job } from '@repo/db/schema/job-schema';
import {
  resume,
  resumeAiChat,
  resumeAiConversation,
  resumeAiMessage,
  resumeCertification,
  resumeContact,
  resumeEducation,
  resumeEducationBullet,
  resumeExperience,
  resumeExperienceBullet,
  resumeLanguage,
  resumeLink,
  resumeNote,
  resumeProject,
  resumeSkill,
  resumeSkillGroup,
  resumeSummary,
  resumeTalk,
  resumeVolunteer,
} from '@repo/db/schema/resume';
import { savedProject } from '@repo/db/schema/saved-project-schema';
import { getTableName } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { AdminRowMode } from './admin-tables.dto.js';

/** Registry used only to preserve event-sourced table behavior; not an HTTP allowlist. */
export const tablesByCollection = {
  resume,
  resumeExperience,
  resumeExperienceBullet,
  resumeEducation,
  resumeEducationBullet,
  resumeSkillGroup,
  resumeSkill,
  resumeContact,
  resumeProject,
  resumeSummary,
  resumeNote,
  resumeLink,
  resumeLanguage,
  resumeCertification,
  resumeVolunteer,
  resumeTalk,
  resumeAiChat,
  resumeAiConversation,
  resumeAiMessage,
  savedProject,
  job,
  coverLetter,
  applicationAnswer,
  assistantSkill,
} satisfies Record<string, SQLiteTable>;

export type CollectionId = keyof typeof tablesByCollection;

const LOCAL_ONLY_COLLECTIONS = new Set<string>([
  'resumeAiChat',
  'resumeAiConversation',
  'resumeAiMessage',
]);
const READ_ONLY_TABLES = new Set([
  'sync_event',
  'sync_backend',
  '__drizzle_migrations',
]);

export function isCollectionId(value: string): value is CollectionId {
  return value in tablesByCollection && !LOCAL_ONLY_COLLECTIONS.has(value);
}

export function collectionForTable({
  table,
}: {
  table: string;
}): CollectionId | null {
  for (const [collectionId, tableRef] of Object.entries(tablesByCollection)) {
    if (!isCollectionId(collectionId)) continue;
    if (getTableName(tableRef) === table) return collectionId;
  }
  return null;
}

export function tableForCollection({
  collectionId,
}: {
  collectionId: CollectionId;
}) {
  return tablesByCollection[collectionId];
}

export function tableNameForCollection({
  collectionId,
}: {
  collectionId: CollectionId;
}) {
  return getTableName(tableForCollection({ collectionId }));
}

export function rowModeFor({ table }: { table: string }): AdminRowMode {
  if (READ_ONLY_TABLES.has(table)) return 'readonly';
  return collectionForTable({ table }) ? 'synced' : 'direct';
}
