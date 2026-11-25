import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AppUser } from '../auth/helpers/app-user.js';
import { CurrentUser, Public } from '../auth/helpers/auth.decorators.js';
import {
  ClaimResponseDto,
  JoinWaitlistDto,
  JoinedResponseDto,
} from './join.schema.js';
import { WaitlistService } from './waitlist.service.js';

@ApiTags('waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Public()
  @Post()
  @HttpCode(200)
  @ApiOkResponse({ type: JoinedResponseDto })
  join(@Body() body: JoinWaitlistDto, @CurrentUser() current?: AppUser) {
    return this.waitlist.join({ body, current });
  }

  @Post('claim')
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOkResponse({ type: ClaimResponseDto })
  claim(@CurrentUser() current: AppUser) {
    return this.waitlist.claim({ current });
  }
}
