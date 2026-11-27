import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../auth/helpers/utils.js';
import { ApiErrorDto } from '../shared/openapi/api-error.dto.js';
import { ApiAuthResponses } from '../shared/openapi/auth-responses.decorator.js';
import { CreditLedgerService } from './credit-ledger.service.js';
import {
  CreditLedgerPageDto,
  CreditLedgerQueryDto,
  CreditsResponseDto,
  WalletCheckDto,
  WalletCheckResponseDto,
} from './credits.dto.js';
import { periodKeyOf } from './period.js';
import { CreditsService } from './credits.service.js';

@ApiTags('credits')
@ApiCookieAuth()
@ApiAuthResponses({ forbiddenDescription: 'Account banned' })
@ApiBadRequestResponse({ type: ApiErrorDto })
@Controller('credits')
export class CreditsController {
  constructor(
    private readonly credits: CreditsService,
    private readonly ledgerReader: CreditLedgerService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Read the signed-in user's wallet and policy" })
  @ApiOkResponse({ type: CreditsResponseDto })
  read(@CurrentUser() current: UserWithRole) {
    return this.credits.read({ userId: current.id });
  }

  @Post('checks')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check available credits without spending any' })
  @ApiOkResponse({ type: WalletCheckResponseDto })
  check(@CurrentUser() current: UserWithRole, @Body() body: WalletCheckDto) {
    return this.credits.check({ userId: current.id, action: body.action });
  }

  @Get('ledger')
  @ApiOperation({ summary: "List the signed-in user's credit ledger" })
  @ApiOkResponse({ type: CreditLedgerPageDto })
  async ledger(
    @CurrentUser() current: UserWithRole,
    @Query() query: CreditLedgerQueryDto,
  ) {
    const page = await this.ledgerReader.page({
      userId: current.id,
      page: query.page,
      perPage: query.perPage,
    });
    return { ...page, periodKey: periodKeyOf({ date: new Date() }) };
  }
}
