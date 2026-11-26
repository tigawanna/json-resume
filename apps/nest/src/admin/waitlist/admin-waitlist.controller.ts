import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../../auth/helpers/utils.js';
import { CursorPaginatedDto } from '../../shared/types/response-shapes.js';
import {
  AddWaitlistEntryDto,
  WaitlistEntryDto,
  WaitlistIdParamDto,
  WaitlistListQueryDto,
} from './admin-waitlist.dto.js';
import { AdminWaitlistService } from './admin-waitlist.service.js';

@Roles({ roles: ['admin'] })
@ApiTags('admin')
@ApiCookieAuth()
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/waitlist')
export class AdminWaitlistController {
  constructor(private readonly waitlist: AdminWaitlistService) {}

  @Get()
  @ApiOperation({ summary: 'List waitlist entries (cursor paginated)' })
  @ApiOkResponse({ type: CursorPaginatedDto })
  findAll(@Query() query: WaitlistListQueryDto) {
    return this.waitlist.findAll({ query });
  }

  @Post()
  @ApiOperation({ summary: 'Add an email to the waitlist' })
  @ApiCreatedResponse({ type: WaitlistEntryDto })
  @ApiConflictResponse({ description: 'Email is already on the waitlist' })
  add(@Body() body: AddWaitlistEntryDto, @CurrentUser() actor: UserWithRole) {
    return this.waitlist.add({ actor, body });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a waitlist entry' })
  @ApiOkResponse({ type: WaitlistEntryDto })
  @ApiNotFoundResponse({ description: 'Waitlist entry not found' })
  findOne(@Param() { id }: WaitlistIdParamDto) {
    return this.waitlist.findOne({ id });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Mark a waitlist entry as removed' })
  @ApiOkResponse({ type: WaitlistEntryDto })
  @ApiNotFoundResponse({ description: 'Waitlist entry not found' })
  remove(
    @Param() { id }: WaitlistIdParamDto,
    @CurrentUser() actor: UserWithRole,
  ) {
    return this.waitlist.remove({ actor, id });
  }
}
