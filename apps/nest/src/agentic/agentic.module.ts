import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { LegacyImportModule } from '../legacy-import/legacy-import.module.js';
import { AgenticAuthService } from './agentic-auth.service.js';
import { AgenticController } from './agentic.controller.js';
import { AgenticJobService } from './agentic-job.service.js';
import { AgenticLibraryService } from './agentic-library.service.js';
import { AgenticResumeService } from './agentic-resume.service.js';

@Module({
  imports: [DatabaseModule, LegacyImportModule],
  controllers: [AgenticController],
  providers: [
    AgenticAuthService,
    AgenticJobService,
    AgenticLibraryService,
    AgenticResumeService,
  ],
})
export class AgenticModule {}
