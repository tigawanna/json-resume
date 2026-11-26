import { Controller, Get } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/helpers/auth.decorators.js';
import { AdminUserDto } from './admin-users.dto.js';
import { AdminUsersService } from './admin-users.service.js';

@Roles({ roles: ['admin'] })
@ApiTags('admin')
@ApiCookieAuth()
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with event and resume counts' })
  @ApiOkResponse({ type: AdminUserDto, isArray: true })
  findAll() {
    return this.users.findAll();
  }
}
