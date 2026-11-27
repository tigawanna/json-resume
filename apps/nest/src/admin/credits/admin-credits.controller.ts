import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../../auth/helpers/utils.js';
import { ApiErrorDto } from '../../shared/openapi/api-error.dto.js';
import { ApiAuthResponses } from '../../shared/openapi/auth-responses.decorator.js';
import {
  AdminAdjustDto,
  AdminCreditLedgerPageDto,
  AdminCreditMutationResponseDto,
  AdminGrantDto,
  AdminWalletResponseDto,
  CreditLedgerListQueryDto,
  CreditsUserIdParamDto,
} from './admin-credits.dto.js';
import { AdminCreditsService } from './admin-credits.service.js';

@Roles({ roles: ['admin'] })
@ApiTags('admin')
@ApiCookieAuth()
@ApiAuthResponses({ forbiddenDescription: 'Admin role required' })
@ApiBadRequestResponse({ type: ApiErrorDto })
@Controller('admin/credits')
export class AdminCreditsController {
  constructor(private readonly credits: AdminCreditsService) {}

  @Get(':userId/ledger')
  @ApiOperation({ summary: "List a user's credit ledger" })
  @ApiOkResponse({ type: AdminCreditLedgerPageDto })
  ledger(
    @Param() { userId }: CreditsUserIdParamDto,
    @Query() query: CreditLedgerListQueryDto,
  ) {
    return this.credits.ledger({ userId, query });
  }

  @Get(':userId')
  @ApiOperation({ summary: "Read a user's wallet without allocating credits" })
  @ApiOkResponse({ type: AdminWalletResponseDto })
  @ApiNotFoundResponse({ description: 'User not found', type: ApiErrorDto })
  read(@Param() { userId }: CreditsUserIdParamDto) {
    return this.credits.read({ userId });
  }

  @Post(':userId/grants')
  @HttpCode(200)
  @ApiOperation({ summary: 'Grant bonus credits' })
  @ApiOkResponse({ type: AdminCreditMutationResponseDto })
  @ApiBadRequestResponse({ description: 'User is banned', type: ApiErrorDto })
  @ApiNotFoundResponse({ description: 'User not found', type: ApiErrorDto })
  grant(
    @Param() { userId }: CreditsUserIdParamDto,
    @Body() body: AdminGrantDto,
    @CurrentUser() actor: UserWithRole,
  ) {
    return this.credits.grant({ actor, userId, body });
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Adjust a monthly or bonus credit balance' })
  @ApiOkResponse({ type: AdminCreditMutationResponseDto })
  @ApiBadRequestResponse({
    description: 'User is banned or the balance would go negative',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({ description: 'User not found', type: ApiErrorDto })
  adjust(
    @Param() { userId }: CreditsUserIdParamDto,
    @Body() body: AdminAdjustDto,
    @CurrentUser() actor: UserWithRole,
  ) {
    return this.credits.adjust({ actor, userId, body });
  }
}
