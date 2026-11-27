import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../../auth/helpers/utils.js';
import { ApiAuthResponses } from '../../shared/openapi/auth-responses.decorator.js';
import {
  AdminLibraryActionDto,
  AdminLibraryCompactResponseDto,
  AdminLibraryPruneResponseDto,
} from './admin-library.dto.js';
import { AdminLibraryService } from './admin-library.service.js';

@Roles({ roles: ['admin'] })
@ApiTags('admin')
@ApiCookieAuth()
@ApiAuthResponses({ forbiddenDescription: 'Admin role required' })
@Controller('admin/library')
export class AdminLibraryController {
  constructor(private readonly library: AdminLibraryService) {}

  @Post('compact')
  @HttpCode(200)
  @ApiOkResponse({ type: AdminLibraryCompactResponseDto })
  compact(
    @CurrentUser() actor: UserWithRole,
    @Body() body: AdminLibraryActionDto,
  ) {
    return this.library.compact({ actor, body });
  }

  @Post('prune')
  @HttpCode(200)
  @ApiOkResponse({ type: AdminLibraryPruneResponseDto })
  prune(
    @CurrentUser() actor: UserWithRole,
    @Body() body: AdminLibraryActionDto,
  ) {
    return this.library.prune({ actor, body });
  }
}
