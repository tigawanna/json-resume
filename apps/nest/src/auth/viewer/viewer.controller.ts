import { Controller, Get } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiAuthResponses } from '../../shared/openapi/auth-responses.decorator.js';
import { CurrentSession } from '../helpers/auth.decorators.js';
import type { AuthSession } from '../helpers/utils.js';
import { ViewerResponseDto } from './viewer.dto.js';

@ApiTags('auth')
@ApiCookieAuth()
@ApiAuthResponses({ forbiddenDescription: 'Account banned' })
@Controller('viewer')
export class ViewerController {
  @Get()
  @ApiOperation({ summary: "Read the caller's full Better Auth session" })
  @ApiOkResponse({ type: ViewerResponseDto })
  viewer(@CurrentSession() session: AuthSession) {
    // Explicit mapping: the session token and other private columns never leave.
    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        image: session.user.image,
        role: session.user.role,
        banned: session.user.banned,
        banReason: session.user.banReason,
        banExpires: session.user.banExpires,
        createdAt: session.user.createdAt,
        updatedAt: session.user.updatedAt,
      },
      session: {
        id: session.session.id,
        userId: session.session.userId,
        expiresAt: session.session.expiresAt,
        createdAt: session.session.createdAt,
        updatedAt: session.session.updatedAt,
        ipAddress: session.session.ipAddress,
        userAgent: session.session.userAgent,
        impersonatedBy: session.session.impersonatedBy,
        activeOrganizationId: session.session.activeOrganizationId,
      },
    };
  }
}
