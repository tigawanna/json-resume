import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Public } from '../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../auth/helpers/utils.js';
import { ApiAuthResponses } from '../shared/openapi/auth-responses.decorator.js';
import { ApiErrorDto } from '../shared/openapi/api-error.dto.js';
import {
  PublicResumeDto,
  PublicResumeIdParamDto,
  PublicResumeListItemDto,
  PublicResumeListQueryDto,
  PublicResumeListResponseDto,
  publicResumeDtoSchema,
  PublicResumeMutationResponseDto,
  PublicResumeSourceQueryDto,
  PublishPublicResumeDto,
  RenamePublicResumeDto,
  UnpublishPublicResumeDto,
} from './public-resume.dto.js';
import { PublicResumeService } from './public-resume.service.js';

@ApiTags('public-resumes')
@Controller('public-resumes')
export class PublicResumeController {
  constructor(private readonly publicResumes: PublicResumeService) {}

  @Get()
  @ApiCookieAuth()
  @ApiAuthResponses()
  @ApiOkResponse({ type: PublicResumeListResponseDto })
  list(
    @CurrentUser() current: UserWithRole,
    @Query() query: PublicResumeListQueryDto,
  ) {
    return this.publicResumes.list({ userId: current.id, query });
  }

  @Get('mine')
  @ApiCookieAuth()
  @ApiAuthResponses()
  @ZodSerializerDto(publicResumeDtoSchema.nullable())
  @ApiOkResponse({ type: PublicResumeDto, nullable: true })
  getMine(
    @CurrentUser() current: UserWithRole,
    @Query() query: PublicResumeSourceQueryDto,
  ) {
    return this.publicResumes.getMine({
      userId: current.id,
      sourceResumeId: query.sourceResumeId,
    });
  }

  @Post()
  @HttpCode(201)
  @ApiCookieAuth()
  @ApiAuthResponses()
  @ApiOkResponse({ type: PublicResumeDto })
  publish(
    @CurrentUser() current: UserWithRole,
    @Body() body: PublishPublicResumeDto,
  ) {
    return this.publicResumes.publish({ userId: current.id, body });
  }

  @Post('unpublish')
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiAuthResponses()
  @ApiOkResponse({ type: PublicResumeMutationResponseDto })
  unpublishBySource(
    @CurrentUser() current: UserWithRole,
    @Body() body: UnpublishPublicResumeDto,
  ) {
    return this.publicResumes.unpublishBySource({
      userId: current.id,
      sourceResumeId: body.sourceResumeId,
    });
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiAuthResponses()
  @ApiNotFoundResponse({ type: ApiErrorDto })
  @ApiOkResponse({ type: PublicResumeListItemDto })
  rename(
    @CurrentUser() current: UserWithRole,
    @Param() params: PublicResumeIdParamDto,
    @Body() body: RenamePublicResumeDto,
  ) {
    return this.publicResumes.rename({
      userId: current.id,
      id: params.id,
      title: body.title,
    });
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiAuthResponses()
  @ApiOkResponse({ type: PublicResumeMutationResponseDto })
  unpublishById(
    @CurrentUser() current: UserWithRole,
    @Param() params: PublicResumeIdParamDto,
  ) {
    return this.publicResumes.unpublishById({
      userId: current.id,
      id: params.id,
    });
  }

  @Public()
  @Get(':id')
  @ZodSerializerDto(publicResumeDtoSchema.nullable())
  @ApiOkResponse({ type: PublicResumeDto, nullable: true })
  getById(@Param() params: PublicResumeIdParamDto) {
    return this.publicResumes.getById({ id: params.id });
  }
}
