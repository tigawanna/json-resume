import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../auth/helpers/utils.js';
import { ApiAuthResponses } from '../shared/openapi/auth-responses.decorator.js';
import { ResumeDetailDto, ResumeListItemDto } from './dto/resume.dto.js';
import {
  LegacyImportResumeIdParamDto,
  LegacyImportResumeListQueryDto,
} from './dto/query.dto.js';
import { LegacyImportService } from './legacy-import.service.js';

@ApiTags('legacy-import')
@ApiCookieAuth()
@ApiAuthResponses()
@Controller('legacy-import')
export class LegacyImportResumeController {
  constructor(private readonly legacyImport: LegacyImportService) {}

  @Get('resumes')
  @ApiOkResponse({ type: ResumeListItemDto, isArray: true })
  listResumes(
    @CurrentUser() current: UserWithRole,
    @Query() query: LegacyImportResumeListQueryDto,
  ) {
    return this.legacyImport.listResumes({ userId: current.id, query });
  }

  @Get('resumes/:id')
  @ApiOkResponse({ type: ResumeDetailDto, nullable: true })
  getResume(
    @CurrentUser() current: UserWithRole,
    @Param() params: LegacyImportResumeIdParamDto,
  ) {
    return this.legacyImport.getResume({ userId: current.id, id: params.id });
  }
}
