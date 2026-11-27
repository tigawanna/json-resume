import type { ResumeLayout } from '@repo/isomorphic/resume/layout';
import { job } from '@repo/db/postgres/schema/job-schema';
import {
  resumeEducation,
  resumeEducationBullet,
  resumeExperience,
  resumeExperienceBullet,
  resumeSkill,
  resumeSkillGroup,
} from '@repo/db/postgres/schema/resume';
import { and, eq, inArray } from 'drizzle-orm';
import type { DrizzleDB } from '../../../database/database.module.js';
import { byIds } from '../../queries/common.js';
import {
  educationBulletColumns,
  educationColumns,
  experienceBulletColumns,
  experienceColumns,
  jobColumns,
  skillColumns,
  skillGroupColumns,
} from './columns.js';
import { toJobSnapshot, toSnapshotRow } from './snapshot.js';

export async function loadRelationRows({
  db,
  userId,
  layout,
  jobId,
}: {
  db: DrizzleDB;
  userId: string;
  layout: ResumeLayout;
  jobId?: string | null;
}) {
  const [experiences, education, skillGroups, jobs] = await Promise.all([
    byIds({
      ids: layout.experiences.map((entry) => entry.id),
      load: (ids) =>
        db
          .select(experienceColumns)
          .from(resumeExperience)
          .where(
            and(
              eq(resumeExperience.userId, userId),
              inArray(resumeExperience.id, ids),
            ),
          ),
    }),
    byIds({
      ids: layout.education,
      load: (ids) =>
        db
          .select(educationColumns)
          .from(resumeEducation)
          .where(
            and(
              eq(resumeEducation.userId, userId),
              inArray(resumeEducation.id, ids),
            ),
          ),
    }),
    byIds({
      ids: layout.skillGroups.map((entry) => entry.id),
      load: (ids) =>
        db
          .select(skillGroupColumns)
          .from(resumeSkillGroup)
          .where(
            and(
              eq(resumeSkillGroup.userId, userId),
              inArray(resumeSkillGroup.id, ids),
            ),
          ),
    }),
    byIds({
      ids: jobId ? [jobId] : [],
      load: (ids) =>
        db
          .select(jobColumns)
          .from(job)
          .where(and(eq(job.userId, userId), inArray(job.id, ids))),
    }),
  ]);

  const [experienceBullets, educationBullets, skills] = await Promise.all([
    byIds({
      ids:
        experiences.length === 0
          ? []
          : layout.experiences.flatMap((entry) => entry.bullets),
      load: (ids) =>
        db
          .select(experienceBulletColumns)
          .from(resumeExperienceBullet)
          .innerJoin(
            resumeExperience,
            eq(resumeExperienceBullet.experienceId, resumeExperience.id),
          )
          .where(
            and(
              eq(resumeExperience.userId, userId),
              inArray(resumeExperienceBullet.id, ids),
              inArray(
                resumeExperienceBullet.experienceId,
                experiences.map((experience) => experience.id),
              ),
            ),
          ),
    }),
    byIds({
      ids: education.map((row) => row.id),
      load: (ids) =>
        db
          .select(educationBulletColumns)
          .from(resumeEducationBullet)
          .innerJoin(
            resumeEducation,
            eq(resumeEducationBullet.educationId, resumeEducation.id),
          )
          .where(
            and(
              eq(resumeEducation.userId, userId),
              inArray(resumeEducationBullet.educationId, ids),
            ),
          ),
    }),
    byIds({
      ids: layout.skillGroups.flatMap((entry) => entry.skills),
      load: (ids) =>
        db
          .select(skillColumns)
          .from(resumeSkill)
          .where(
            and(eq(resumeSkill.userId, userId), inArray(resumeSkill.id, ids)),
          ),
    }),
  ]);

  return {
    experiences: experiences.map((row) => toSnapshotRow({ row })),
    experienceBullets: experienceBullets.map((row) => toSnapshotRow({ row })),
    education: education.map((row) => toSnapshotRow({ row })),
    educationBullets: educationBullets.map((row) => toSnapshotRow({ row })),
    skillGroups: skillGroups.map((row) => toSnapshotRow({ row })),
    skills: skills.map((row) => toSnapshotRow({ row })),
    jobs: jobs.map(toJobSnapshot),
  };
}
