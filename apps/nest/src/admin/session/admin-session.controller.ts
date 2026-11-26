import { Controller, Get } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../../auth/helpers/utils.js';
import { AdminSessionDto } from './admin-session.dto.js';

@Roles({ roles: ['admin'] })
@ApiTags('admin')
@ApiCookieAuth()
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/session')
export class AdminSessionController {
  @Get()
  @ApiOperation({ summary: 'Probe that the current session has admin access' })
  @ApiOkResponse({ type: AdminSessionDto })
  probe(@CurrentUser() current: UserWithRole) {
    return {
      id: current.id,
      name: current.name,
      email: current.email,
      role: current.role,
    };
  }
}
