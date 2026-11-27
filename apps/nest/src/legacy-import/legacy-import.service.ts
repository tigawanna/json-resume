import { Injectable } from '@nestjs/common';
import type {
  LegacyImportListQueryDto,
  LegacyImportResumeListQueryDto,
} from './dto/query.dto.js';
import { LegacyCertificationRepository } from './repositories/certification.repository.js';
import { LegacyContactRepository } from './repositories/contact.repository.js';
import { LegacyEducationRepository } from './repositories/education.repository.js';
import { LegacyExperienceRepository } from './repositories/experience.repository.js';
import { LegacyLanguageRepository } from './repositories/language.repository.js';
import { LegacyLinkRepository } from './repositories/link.repository.js';
import { LegacyProjectRepository } from './repositories/project.repository.js';
import { LegacyResumeDetailRepository } from './repositories/resume-detail.repository.js';
import { LegacyResumeListRepository } from './repositories/resume-list.repository.js';
import { LegacySkillGroupRepository } from './repositories/skill-group.repository.js';
import { LegacySummaryRepository } from './repositories/summary.repository.js';
import { LegacyTalkRepository } from './repositories/talk.repository.js';
import { LegacyVolunteerRepository } from './repositories/volunteer.repository.js';

@Injectable()
export class LegacyImportService {
  constructor(
    private readonly talks: LegacyTalkRepository,
    private readonly links: LegacyLinkRepository,
    private readonly projects: LegacyProjectRepository,
    private readonly certifications: LegacyCertificationRepository,
    private readonly languages: LegacyLanguageRepository,
    private readonly skillGroups: LegacySkillGroupRepository,
    private readonly experiences: LegacyExperienceRepository,
    private readonly education: LegacyEducationRepository,
    private readonly volunteers: LegacyVolunteerRepository,
    private readonly contacts: LegacyContactRepository,
    private readonly summaries: LegacySummaryRepository,
    private readonly resumes: LegacyResumeListRepository,
    private readonly resumeDetail: LegacyResumeDetailRepository,
  ) {}

  listTalks({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportListQueryDto;
  }) {
    return this.talks.list({ userId, query });
  }

  listLinks({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportListQueryDto;
  }) {
    return this.links.list({ userId, query });
  }

  listProjects({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportListQueryDto;
  }) {
    return this.projects.list({ userId, query });
  }

  listCertifications({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportListQueryDto;
  }) {
    return this.certifications.list({ userId, query });
  }

  listLanguages({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportListQueryDto;
  }) {
    return this.languages.list({ userId, query });
  }

  listSkillGroups({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportListQueryDto;
  }) {
    return this.skillGroups.list({ userId, query });
  }

  listExperiences({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportListQueryDto;
  }) {
    return this.experiences.list({ userId, query });
  }

  listEducation({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportListQueryDto;
  }) {
    return this.education.list({ userId, query });
  }

  listVolunteers({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportListQueryDto;
  }) {
    return this.volunteers.list({ userId, query });
  }

  listContacts({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportListQueryDto;
  }) {
    return this.contacts.list({ userId, query });
  }

  listSummaries({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportListQueryDto;
  }) {
    return this.summaries.list({ userId, query });
  }

  listResumes({
    userId,
    query,
  }: {
    userId: string;
    query: LegacyImportResumeListQueryDto;
  }) {
    return this.resumes.list({ userId, query });
  }

  getResume({ userId, id }: { userId: string; id: string }) {
    return this.resumeDetail.get({ userId, id });
  }
}
