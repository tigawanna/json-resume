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
import {
  CompactionOutcomeDto,
  CompactionProposalDto,
  OutboundEventBatchDto,
  PullResponseDto,
  PushResponseDto,
  SyncEventsQueryDto,
} from './sync.dto.js';
import { SyncCompactionService } from './sync-compaction.service.js';
import { SyncPullService } from './sync-pull.service.js';
import { SyncPushService } from './sync-push.service.js';

@ApiTags('sync')
@ApiCookieAuth()
@ApiAuthResponses({ forbiddenDescription: 'Account banned' })
@ApiBadRequestResponse({ type: ApiErrorDto })
@Controller('sync')
export class SyncController {
  constructor(
    private readonly push: SyncPushService,
    private readonly pull: SyncPullService,
    private readonly compaction: SyncCompactionService,
  ) {}

  @Post('events')
  @HttpCode(200)
  @ApiOperation({ summary: 'Push a batch of device events' })
  @ApiOkResponse({ type: PushResponseDto })
  pushEvents(
    @CurrentUser() current: UserWithRole,
    @Body() events: OutboundEventBatchDto,
  ) {
    return this.push.push({ userId: current.id, events });
  }

  @Get('events')
  @HttpCode(200)
  @ApiOperation({ summary: 'Pull events newer than the cursor' })
  @ApiOkResponse({ type: PullResponseDto })
  pullEvents(
    @CurrentUser() current: UserWithRole,
    @Query() query: SyncEventsQueryDto,
  ) {
    return this.pull.pull({ userId: current.id, since: query.since });
  }

  @Post('compact')
  @HttpCode(200)
  @ApiOperation({ summary: 'Append a device-planned library compaction' })
  @ApiOkResponse({ type: CompactionOutcomeDto })
  compact(
    @CurrentUser() current: UserWithRole,
    @Body() proposal: CompactionProposalDto,
  ) {
    return this.compaction.propose({ userId: current.id, proposal });
  }
}
