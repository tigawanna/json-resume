import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../auth/helpers/utils.js';
import { ApiAuthResponses } from '../shared/openapi/auth-responses.decorator.js';
import { ApiErrorDto } from '../shared/openapi/api-error.dto.js';
import {
  GithubReposResponseDto,
  GithubSearchQueryDto,
  GithubSearchResponseDto,
} from './github.dto.js';
import { GithubService } from './github.service.js';

const GITHUB_RATE_LIMIT = { limit: 60, ttl: 60_000 };

@Throttle({ default: GITHUB_RATE_LIMIT })
@ApiTags('github')
@Controller('github')
export class GithubController {
  constructor(private readonly github: GithubService) {}

  @Get('repos')
  @ApiCookieAuth()
  @ApiAuthResponses()
  @ApiOkResponse({ type: GithubReposResponseDto })
  @ApiBadGatewayResponse({ type: ApiErrorDto })
  listRepositories(@CurrentUser() current: UserWithRole) {
    return this.github.listRepositories({ userId: current.id });
  }

  @Get('repos/search')
  @ApiCookieAuth()
  @ApiAuthResponses()
  @ApiOkResponse({ type: GithubSearchResponseDto })
  @ApiBadGatewayResponse({ type: ApiErrorDto })
  searchRepositories(
    @CurrentUser() current: UserWithRole,
    @Query() query: GithubSearchQueryDto,
  ) {
    return this.github.searchRepositories({
      userId: current.id,
      params: query,
    });
  }
}
