import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../auth/helpers/utils.js';
import { ApiAuthResponses } from '../shared/openapi/auth-responses.decorator.js';
import {
  CertificationPageDto,
  ContactPageDto,
  EducationPageDto,
  ExperiencePageDto,
  LanguagePageDto,
  LinkPageDto,
  ProjectPageDto,
  SkillGroupPageDto,
  SummaryPageDto,
  TalkPageDto,
  VolunteerPageDto,
} from './dto/library-pages.dto.js';
import { LegacyImportListQueryDto } from './dto/query.dto.js';
import { LegacyImportService } from './legacy-import.service.js';

@ApiTags('legacy-import')
@ApiCookieAuth()
@ApiAuthResponses()
@Controller('legacy-import')
export class LegacyImportLibraryController {
  constructor(private readonly legacyImport: LegacyImportService) {}

  @Get('talks')
  @ApiOkResponse({ type: TalkPageDto })
  listTalks(
    @CurrentUser() current: UserWithRole,
    @Query() query: LegacyImportListQueryDto,
  ) {
    return this.legacyImport.listTalks({ userId: current.id, query });
  }

  @Get('links')
  @ApiOkResponse({ type: LinkPageDto })
  listLinks(
    @CurrentUser() current: UserWithRole,
    @Query() query: LegacyImportListQueryDto,
  ) {
    return this.legacyImport.listLinks({ userId: current.id, query });
  }

  @Get('projects')
  @ApiOkResponse({ type: ProjectPageDto })
  listProjects(
    @CurrentUser() current: UserWithRole,
    @Query() query: LegacyImportListQueryDto,
  ) {
    return this.legacyImport.listProjects({ userId: current.id, query });
  }

  @Get('certifications')
  @ApiOkResponse({ type: CertificationPageDto })
  listCertifications(
    @CurrentUser() current: UserWithRole,
    @Query() query: LegacyImportListQueryDto,
  ) {
    return this.legacyImport.listCertifications({ userId: current.id, query });
  }

  @Get('languages')
  @ApiOkResponse({ type: LanguagePageDto })
  listLanguages(
    @CurrentUser() current: UserWithRole,
    @Query() query: LegacyImportListQueryDto,
  ) {
    return this.legacyImport.listLanguages({ userId: current.id, query });
  }

  @Get('skill-groups')
  @ApiOkResponse({ type: SkillGroupPageDto })
  listSkillGroups(
    @CurrentUser() current: UserWithRole,
    @Query() query: LegacyImportListQueryDto,
  ) {
    return this.legacyImport.listSkillGroups({ userId: current.id, query });
  }

  @Get('experiences')
  @ApiOkResponse({ type: ExperiencePageDto })
  listExperiences(
    @CurrentUser() current: UserWithRole,
    @Query() query: LegacyImportListQueryDto,
  ) {
    return this.legacyImport.listExperiences({ userId: current.id, query });
  }

  @Get('education')
  @ApiOkResponse({ type: EducationPageDto })
  listEducation(
    @CurrentUser() current: UserWithRole,
    @Query() query: LegacyImportListQueryDto,
  ) {
    return this.legacyImport.listEducation({ userId: current.id, query });
  }

  @Get('volunteers')
  @ApiOkResponse({ type: VolunteerPageDto })
  listVolunteers(
    @CurrentUser() current: UserWithRole,
    @Query() query: LegacyImportListQueryDto,
  ) {
    return this.legacyImport.listVolunteers({ userId: current.id, query });
  }

  @Get('contacts')
  @ApiOkResponse({ type: ContactPageDto })
  listContacts(
    @CurrentUser() current: UserWithRole,
    @Query() query: LegacyImportListQueryDto,
  ) {
    return this.legacyImport.listContacts({ userId: current.id, query });
  }

  @Get('summaries')
  @ApiOkResponse({ type: SummaryPageDto })
  listSummaries(
    @CurrentUser() current: UserWithRole,
    @Query() query: LegacyImportListQueryDto,
  ) {
    return this.legacyImport.listSummaries({ userId: current.id, query });
  }
}
