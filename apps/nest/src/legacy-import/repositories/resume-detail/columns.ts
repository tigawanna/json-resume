import { getTableColumns } from 'drizzle-orm';
import { job } from '@repo/db/postgres/schema/job-schema';
import {
  resume,
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
} from '@repo/db/postgres/schema/resume';

const {
  embedding: _resumeEmbedding,
  embeddingModel: _resumeEmbeddingModel,
  ...resumeColumns
} = getTableColumns(resume);
const {
  embedding: _contactEmbedding,
  embeddingModel: _contactEmbeddingModel,
  ...contactColumns
} = getTableColumns(resumeContact);
const {
  embedding: _linkEmbedding,
  embeddingModel: _linkEmbeddingModel,
  ...linkColumns
} = getTableColumns(resumeLink);
const {
  embedding: _summaryEmbedding,
  embeddingModel: _summaryEmbeddingModel,
  ...summaryColumns
} = getTableColumns(resumeSummary);
const {
  embedding: _noteEmbedding,
  embeddingModel: _noteEmbeddingModel,
  ...noteColumns
} = getTableColumns(resumeNote);
const {
  embedding: _projectEmbedding,
  embeddingModel: _projectEmbeddingModel,
  ...projectColumns
} = getTableColumns(resumeProject);
const {
  embedding: _talkEmbedding,
  embeddingModel: _talkEmbeddingModel,
  ...talkColumns
} = getTableColumns(resumeTalk);
const {
  embedding: _certificationEmbedding,
  embeddingModel: _certificationEmbeddingModel,
  ...certificationColumns
} = getTableColumns(resumeCertification);
const {
  embedding: _volunteerEmbedding,
  embeddingModel: _volunteerEmbeddingModel,
  ...volunteerColumns
} = getTableColumns(resumeVolunteer);
const {
  embedding: _languageEmbedding,
  embeddingModel: _languageEmbeddingModel,
  ...languageColumns
} = getTableColumns(resumeLanguage);
const {
  embedding: _experienceEmbedding,
  embeddingModel: _experienceEmbeddingModel,
  ...experienceColumns
} = getTableColumns(resumeExperience);
const {
  embedding: _experienceBulletEmbedding,
  embeddingModel: _experienceBulletEmbeddingModel,
  ...experienceBulletColumns
} = getTableColumns(resumeExperienceBullet);
const {
  embedding: _educationEmbedding,
  embeddingModel: _educationEmbeddingModel,
  ...educationColumns
} = getTableColumns(resumeEducation);
const {
  embedding: _educationBulletEmbedding,
  embeddingModel: _educationBulletEmbeddingModel,
  ...educationBulletColumns
} = getTableColumns(resumeEducationBullet);
const {
  embedding: _skillGroupEmbedding,
  embeddingModel: _skillGroupEmbeddingModel,
  ...skillGroupColumns
} = getTableColumns(resumeSkillGroup);
const {
  embedding: _skillEmbedding,
  embeddingModel: _skillEmbeddingModel,
  ...skillColumns
} = getTableColumns(resumeSkill);
const {
  embedding: _jobEmbedding,
  embeddingModel: _jobEmbeddingModel,
  ...jobColumns
} = getTableColumns(job);

export {
  resumeColumns,
  contactColumns,
  linkColumns,
  summaryColumns,
  noteColumns,
  projectColumns,
  talkColumns,
  certificationColumns,
  volunteerColumns,
  languageColumns,
  experienceColumns,
  experienceBulletColumns,
  educationColumns,
  educationBulletColumns,
  skillGroupColumns,
  skillColumns,
  jobColumns,
};
