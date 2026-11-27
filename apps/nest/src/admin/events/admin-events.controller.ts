import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/helpers/auth.decorators.js';
import { ApiAuthResponses } from '../../shared/openapi/auth-responses.decorator.js';
import {
  AdminEventCollectionDto,
  AdminEventFilterDto,
  AdminEventListQueryDto,
  AdminEventListResponseDto,
  AdminEventUserDto,
} from './admin-events.dto.js';
import { AdminEventsService } from './admin-events.service.js';

@Roles({ roles: ['admin'] })
@ApiTags('admin')
@ApiCookieAuth()
@ApiAuthResponses({ forbiddenDescription: 'Admin role required' })
@Controller('admin/events')
export class AdminEventsController {
  constructor(private readonly events: AdminEventsService) {}

  @Get()
  @ApiOkResponse({ type: AdminEventListResponseDto })
  list(@Query() query: AdminEventListQueryDto) {
    return this.events.list(query);
  }

  @Get('collections')
  @ApiOkResponse({ type: AdminEventCollectionDto, isArray: true })
  byCollection(@Query() filter: AdminEventFilterDto) {
    return this.events.byCollection(filter);
  }

  @Get('users')
  @ApiOkResponse({ type: AdminEventUserDto, isArray: true })
  users() {
    return this.events.users();
  }
}
