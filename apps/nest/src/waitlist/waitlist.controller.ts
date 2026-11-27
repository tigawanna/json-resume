import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiBadRequestResponse, ApiCookieAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, Public } from "../auth/helpers/auth.decorators.js";
import type { UserWithRole } from "../auth/helpers/utils.js";
import { ApiAuthResponses } from "../shared/openapi/auth-responses.decorator.js";
import { ApiErrorDto } from "../shared/openapi/api-error.dto.js";
import {
  ClaimResponseDto,
  JoinWaitlistDto,
  JoinedResponseDto,
} from "./join.dto.js";
import { WAITLIST_RATE_LIMIT } from "./waitlist.constants.js";
import { WaitlistService } from "./waitlist.service.js";

@Throttle({
  default: { limit: WAITLIST_RATE_LIMIT.limit, ttl: WAITLIST_RATE_LIMIT.ttlMs },
})
@ApiTags("waitlist")
@Controller("waitlist")
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Public()
  @Post()
  @HttpCode(200)
  @ApiOkResponse({ type: JoinedResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  join(@Body() body: JoinWaitlistDto, @CurrentUser() current?: UserWithRole) {
    return this.waitlist.join({ body, current });
  }

  @Post("claim")
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiAuthResponses({ forbiddenDescription: 'Account banned' })
  @ApiOkResponse({ type: ClaimResponseDto })
  claim(@CurrentUser() current: UserWithRole) {
    return this.waitlist.claim({ current });
  }
}
