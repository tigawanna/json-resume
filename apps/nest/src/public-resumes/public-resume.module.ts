import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PublicResumeController } from './public-resume.controller.js';
import { PublicResumeService } from './public-resume.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [PublicResumeController],
  providers: [PublicResumeService],
})
export class PublicResumeModule {}
