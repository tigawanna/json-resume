import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { LegacyImportLibraryController } from './legacy-import-library.controller.js';
import { LegacyImportResumeController } from './legacy-import-resume.controller.js';
import { LegacyImportService } from './legacy-import.service.js';
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

@Module({
  imports: [DatabaseModule],
  controllers: [LegacyImportLibraryController, LegacyImportResumeController],
  providers: [
    LegacyImportService,
    LegacyTalkRepository,
    LegacyLinkRepository,
    LegacyProjectRepository,
    LegacyCertificationRepository,
    LegacyLanguageRepository,
    LegacySkillGroupRepository,
    LegacyExperienceRepository,
    LegacyEducationRepository,
    LegacyVolunteerRepository,
    LegacyContactRepository,
    LegacySummaryRepository,
    LegacyResumeListRepository,
    LegacyResumeDetailRepository,
  ],
  exports: [LegacyImportService],
})
export class LegacyImportModule {}
