import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../helpers/auth.decorators.js';
import type { UserWithRole } from '../helpers/utils.js';
import { ApiAuthResponses } from '../../shared/openapi/auth-responses.decorator.js';
import { MeResponseDto } from './me.dto.js';

@ApiTags('auth')
@ApiCookieAuth()
@ApiAuthResponses({ forbiddenDescription: 'Account banned' })
@Controller('me')
export class MeController {
  @Get()
  @ApiOkResponse({ type: MeResponseDto })
  me(@CurrentUser() current: UserWithRole): MeResponseDto {
    return {
      id: current.id,
      name: current.name,
      email: current.email,
      role: current.role ?? null,
      banned: current.banned ?? null,
    };
  }
}
