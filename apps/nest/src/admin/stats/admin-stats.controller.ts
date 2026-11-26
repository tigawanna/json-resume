import { Controller, Get } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/helpers/auth.decorators.js';
import { AdminStatsDto } from './admin-stats.dto.js';
import { AdminStatsService } from './admin-stats.service.js';

@Roles({ roles: ['admin'] })
@ApiTags('admin')
@ApiCookieAuth()
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  @ApiOkResponse({ type: AdminStatsDto })
  read() {
    return this.stats.read();
  }
}
