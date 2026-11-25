import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser, Public } from '../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../auth/helpers/utils.js';
import {
  ClaimResponseDto,
  JoinWaitlistDto,
  JoinedResponseDto,
} from './join.dto.js';
import { WAITLIST_JOIN_RATE_LIMIT } from './waitlist.constants.js';
import { WaitlistService } from './waitlist.service.js';

@ApiTags('waitlist')
@UseGuards(ThrottlerGuard)
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Public()
  @Throttle({
    default: { limit: WAITLIST_JOIN_RATE_LIMIT.limit, ttl: WAITLIST_JOIN_RATE_LIMIT.ttlMs },
  })
  @Post()
  @HttpCode(200)
  @ApiOkResponse({ type: JoinedResponseDto })
  join(@Body() body: JoinWaitlistDto, @CurrentUser() current?: UserWithRole) {
    return this.waitlist.join({ body, current });
  }

  @Post('claim')
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOkResponse({ type: ClaimResponseDto })
  claim(@CurrentUser() current: UserWithRole) {
    return this.waitlist.claim({ current });
  }
}
