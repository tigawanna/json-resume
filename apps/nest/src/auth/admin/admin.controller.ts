import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, Roles } from '../helpers/auth.decorators.js';
import type { UserWithRole } from '../helpers/utils.js';

/** Probe used to test the role guard. Not an admin product API. */
@ApiTags('auth')
@ApiCookieAuth()
@Controller('admin')
export class AdminController {
  @Get('session')
  @Roles({ roles: ['admin'] })
  session(@CurrentUser() current: UserWithRole) {
    return { id: current.id, role: current.role };
  }
}
