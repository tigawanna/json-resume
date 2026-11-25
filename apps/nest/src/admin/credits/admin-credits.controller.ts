import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../../auth/helpers/utils.js';
import { CursorPaginatedDto } from '../../shared/types/response-shapes.js';
import {
  AdjustCreditsDto,
  AdminCreditsDto,
  CreditLedgerListQueryDto,
  CreditsUserIdParamDto,
} from './admin-credits.dto.js';
import { AdminCreditsService } from './admin-credits.service.js';

@Roles({ roles: ['admin'] })
@ApiTags('admin')
@ApiCookieAuth()
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/credits')
export class AdminCreditsController {
  constructor(private readonly credits: AdminCreditsService) {}

  @Get(':userId')
  @ApiOperation({ summary: "Get a user's credit balance" })
  @ApiOkResponse({ type: AdminCreditsDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  read(@Param() { userId }: CreditsUserIdParamDto) {
    return this.credits.read({ userId });
  }

  @Get(':userId/ledger')
  @ApiOperation({ summary: "List a user's credit ledger (cursor paginated)" })
  @ApiOkResponse({ type: CursorPaginatedDto })
  ledger(@Param() { userId }: CreditsUserIdParamDto, @Query() query: CreditLedgerListQueryDto) {
    return this.credits.ledger({ userId, query });
  }

  @Post(':userId/adjustments')
  @ApiOperation({ summary: 'Grant or deduct bonus credits (idempotent)' })
  @ApiCreatedResponse({ type: AdminCreditsDto })
  @ApiBadRequestResponse({ description: 'Bonus balance would go negative' })
  @ApiNotFoundResponse({ description: 'User not found' })
  adjust(
    @Param() { userId }: CreditsUserIdParamDto,
    @Body() body: AdjustCreditsDto,
    @CurrentUser() current: UserWithRole,
  ) {
    return this.credits.adjust({ userId, adminId: current.id, body });
  }
}
