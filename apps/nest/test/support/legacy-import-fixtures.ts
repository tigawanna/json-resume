import { job } from '@repo/db/postgres/schema/job-schema';
import {
  resume,
  resumeContact,
  resumeEducation,
  resumeEducationBullet,
  resumeExperience,
  resumeExperienceBullet,
  resumeLink,
  resumeSkill,
  resumeSkillGroup,
  resumeTalk,
} from '@repo/db/postgres/schema/resume';
import type { DrizzleDB } from '../../src/database/database.module.js';
import { personas } from './personas.js';

const owner = personas.member.id;
const other = personas.admin.id;
const oldDate = new Date('2024-01-01T00:00:00.000Z');
const newDate = new Date('2024-02-01T00:00:00.000Z');

export async function seedLegacyImportRows({ db }: { db: DrizzleDB }) {
  await db.insert(resumeTalk).values([
    ...Array.from({ length: 13 }, (_, index) => ({
      id: `talk-${String(index + 1).padStart(2, '0')}`,
      userId: owner,
      title: index === 11 ? 'Needle Talk' : `Talk ${index + 1}`,
      createdAt: oldDate,
      updatedAt: oldDate,
    })),
    {
      id: 'talk-admin',
      userId: other,
      title: 'Admin Talk',
      createdAt: oldDate,
      updatedAt: oldDate,
    },
  ]);

  await db.insert(resumeContact).values([
    {
      id: 'contact-1-old',
      userId: owner,
      type: ' EMAIL ',
      value: ' ADA@Example.com ',
      label: 'Work',
      createdAt: oldDate,
      updatedAt: oldDate,
    },
    {
      id: 'contact-2-new',
      userId: owner,
      type: 'email',
      value: 'ada@example.com',
      label: 'Work',
      createdAt: newDate,
      updatedAt: newDate,
    },
    {
      id: 'contact-admin',
      userId: other,
      type: 'email',
      value: 'admin@example.com',
      label: 'Admin',
    },
  ]);

  await db.insert(resumeLink).values([
    {
      id: 'link-old',
      userId: owner,
      label: 'Site',
      url: 'https://example.com',
      updatedAt: oldDate,
    },
    {
      id: 'link-new',
      userId: owner,
      label: 'site',
      url: 'HTTPS://EXAMPLE.COM',
      updatedAt: newDate,
    },
  ]);

  await db.insert(resumeSkillGroup).values([
    { id: 'group-owner', userId: owner, name: 'Languages' },
    { id: 'group-admin', userId: other, name: 'Admin skills' },
  ]);
  await db.insert(resumeSkill).values([
    { id: 'skill-a', userId: owner, name: 'TypeScript' },
    { id: 'skill-b', userId: owner, name: 'Go' },
    { id: 'skill-admin', userId: other, name: 'Private' },
  ]);

  await db.insert(resume).values([
    {
      id: 'resume-owner',
      userId: owner,
      name: 'Owner résumé',
      fullName: 'Ada Lovelace',
      headline: 'Engineer',
      templateId: 'classic',
      jobId: 'job-owner',
      layout: {
        sections: [{ key: 'experience', title: 'Experience', enabled: true }],
        experiences: [
          {
            id: 'experience-owner',
            bullets: ['bullet-owner', 'bullet-foreign'],
          },
        ],
        education: ['education-owner'],
        skillGroups: [
          { id: 'group-owner', skills: ['skill-b', 'skill-a', 'skill-b'] },
        ],
      },
      createdAt: oldDate,
      updatedAt: newDate,
    },
    {
      id: 'resume-admin',
      userId: other,
      name: 'Admin résumé',
      layout: { skillGroups: [{ id: 'group-admin', skills: ['skill-admin'] }] },
    },
  ]);

  await db.insert(job).values({
    id: 'job-owner',
    userId: owner,
    company: 'Analytical Engines',
    title: 'Engineer',
    description: 'Build the Difference Engine',
    status: 'saved',
  });
  await db.insert(resumeExperience).values([
    {
      id: 'experience-owner',
      userId: owner,
      company: 'Analytical Engines',
      role: 'Engineer',
    },
    {
      id: 'experience-foreign',
      userId: other,
      company: 'Private',
      role: 'Engineer',
    },
  ]);
  await db.insert(resumeExperienceBullet).values([
    {
      id: 'bullet-owner',
      experienceId: 'experience-owner',
      text: 'Owned bullet',
    },
    {
      id: 'bullet-foreign',
      experienceId: 'experience-foreign',
      text: 'Private bullet',
    },
  ]);
  await db.insert(resumeEducation).values([
    {
      id: 'education-owner',
      userId: owner,
      school: 'University',
      degree: 'Mathematics',
    },
  ]);
  await db.insert(resumeEducationBullet).values([
    {
      id: 'education-bullet',
      educationId: 'education-owner',
      text: 'Foundations',
    },
  ]);
}
