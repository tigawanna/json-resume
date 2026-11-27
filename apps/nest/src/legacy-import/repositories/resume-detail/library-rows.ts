import type { ResumeLayout } from '@repo/isomorphic/resume/layout';
import {
  resumeCertification,
  resumeContact,
  resumeLanguage,
  resumeLink,
  resumeNote,
  resumeProject,
  resumeSummary,
  resumeTalk,
  resumeVolunteer,
} from '@repo/db/postgres/schema/resume';
import { and, eq, inArray } from 'drizzle-orm';
import type { DrizzleDB } from '../../../database/database.module.js';
import { byIds } from '../../queries/common.js';
import {
  certificationColumns,
  contactColumns,
  languageColumns,
  linkColumns,
  noteColumns,
  projectColumns,
  summaryColumns,
  talkColumns,
  volunteerColumns,
} from './columns.js';
import { toSnapshotRow } from './snapshot.js';

export async function loadLibraryRows({
  db,
  userId,
  layout,
}: {
  db: DrizzleDB;
  userId: string;
  layout: ResumeLayout;
}) {
  const [
    contacts,
    links,
    summaries,
    notes,
    projects,
    talks,
    certifications,
    volunteers,
    languages,
  ] = await Promise.all([
    byIds({
      ids: layout.contacts,
      load: (ids) =>
        db
          .select(contactColumns)
          .from(resumeContact)
          .where(
            and(
              eq(resumeContact.userId, userId),
              inArray(resumeContact.id, ids),
            ),
          ),
    }),
    byIds({
      ids: layout.links,
      load: (ids) =>
        db
          .select(linkColumns)
          .from(resumeLink)
          .where(
            and(eq(resumeLink.userId, userId), inArray(resumeLink.id, ids)),
          ),
    }),
    byIds({
      ids: layout.summaries,
      load: (ids) =>
        db
          .select(summaryColumns)
          .from(resumeSummary)
          .where(
            and(
              eq(resumeSummary.userId, userId),
              inArray(resumeSummary.id, ids),
            ),
          ),
    }),
    byIds({
      ids: layout.notes,
      load: (ids) =>
        db
          .select(noteColumns)
          .from(resumeNote)
          .where(
            and(eq(resumeNote.userId, userId), inArray(resumeNote.id, ids)),
          ),
    }),
    byIds({
      ids: layout.projects,
      load: (ids) =>
        db
          .select(projectColumns)
          .from(resumeProject)
          .where(
            and(
              eq(resumeProject.userId, userId),
              inArray(resumeProject.id, ids),
            ),
          ),
    }),
    byIds({
      ids: layout.talks,
      load: (ids) =>
        db
          .select(talkColumns)
          .from(resumeTalk)
          .where(
            and(eq(resumeTalk.userId, userId), inArray(resumeTalk.id, ids)),
          ),
    }),
    byIds({
      ids: layout.certifications,
      load: (ids) =>
        db
          .select(certificationColumns)
          .from(resumeCertification)
          .where(
            and(
              eq(resumeCertification.userId, userId),
              inArray(resumeCertification.id, ids),
            ),
          ),
    }),
    byIds({
      ids: layout.volunteers,
      load: (ids) =>
        db
          .select(volunteerColumns)
          .from(resumeVolunteer)
          .where(
            and(
              eq(resumeVolunteer.userId, userId),
              inArray(resumeVolunteer.id, ids),
            ),
          ),
    }),
    byIds({
      ids: layout.languages,
      load: (ids) =>
        db
          .select(languageColumns)
          .from(resumeLanguage)
          .where(
            and(
              eq(resumeLanguage.userId, userId),
              inArray(resumeLanguage.id, ids),
            ),
          ),
    }),
  ]);

  return {
    contacts: contacts.map((row) => toSnapshotRow({ row })),
    links: links.map((row) => toSnapshotRow({ row })),
    summaries: summaries.map((row) => toSnapshotRow({ row })),
    notes: notes.map((row) => toSnapshotRow({ row })),
    projects: projects.map((row) => toSnapshotRow({ row })),
    talks: talks.map((row) => toSnapshotRow({ row })),
    certifications: certifications.map((row) => toSnapshotRow({ row })),
    volunteers: volunteers.map((row) => toSnapshotRow({ row })),
    languages: languages.map((row) => toSnapshotRow({ row })),
  };
}
