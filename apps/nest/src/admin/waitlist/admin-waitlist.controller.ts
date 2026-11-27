import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../../auth/helpers/utils.js';
import { ApiErrorDto } from '../../shared/openapi/api-error.dto.js';
import { ApiAuthResponses } from '../../shared/openapi/auth-responses.decorator.js';
import {
  AddWaitlistEntryDto,
  AdminWaitlistPageDto,
  UpdateWaitlistEntryDto,
  WaitlistEntryDto,
  WaitlistEntryIdParamDto,
  WaitlistIdParamDto,
  WaitlistListQueryDto,
  WaitlistStatsDto,
  WaitlistUpdateResponseDto,
} from './admin-waitlist.dto.js';
import { AdminWaitlistQueryService } from './admin-waitlist-query.service.js';
import { AdminWaitlistService } from './admin-waitlist.service.js';

@Roles({ roles: ['admin'] })
@ApiTags('admin')
@ApiCookieAuth()
@ApiAuthResponses({ forbiddenDescription: 'Admin role required' })
@ApiBadRequestResponse({ type: ApiErrorDto })
@Controller('admin/waitlist')
export class AdminWaitlistController {
  constructor(
    private readonly waitlist: AdminWaitlistService,
    private readonly queries: AdminWaitlistQueryService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Count joined, linked, and removed waitlist entries' })
  @ApiOkResponse({ type: WaitlistStatsDto })
  stats() {
    return this.queries.stats();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export every waitlist entry as CSV' })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    content: { 'text/csv': { schema: { type: 'string' } } },
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="waitlist.csv"')
  export() {
    return this.queries.exportCsv();
  }

  @Get()
  @ApiOperation({ summary: 'List waitlist entries with linked account emails' })
  @ApiOkResponse({ type: AdminWaitlistPageDto })
  findAll(@Query() query: WaitlistListQueryDto) {
    return this.queries.findAll({ query });
  }

  @Post()
  @ApiOperation({ summary: 'Add an email to the waitlist' })
  @ApiCreatedResponse({ type: WaitlistEntryDto })
  @ApiConflictResponse({ description: 'Email is already on the waitlist', type: ApiErrorDto })
  add(@Body() body: AddWaitlistEntryDto, @CurrentUser() actor: UserWithRole) {
    return this.waitlist.add({ actor, body });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a waitlist entry' })
  @ApiOkResponse({ type: WaitlistEntryDto })
  @ApiNotFoundResponse({ description: 'Waitlist entry not found', type: ApiErrorDto })
  findOne(@Param() { id }: WaitlistIdParamDto) {
    return this.waitlist.findOne({ id });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Mark a waitlist entry as removed' })
  @ApiOkResponse({ type: WaitlistEntryDto })
  @ApiNotFoundResponse({ description: 'Waitlist entry not found', type: ApiErrorDto })
  remove(
    @Param() { id }: WaitlistIdParamDto,
    @CurrentUser() actor: UserWithRole,
  ) {
    return this.waitlist.remove({ actor, id });
  }

  @Patch('entries/:id')
  @ApiOperation({ summary: 'Update waitlist status, link, or notes' })
  @ApiOkResponse({ type: WaitlistUpdateResponseDto })
  @ApiNotFoundResponse({ description: 'Entry or user not found', type: ApiErrorDto })
  update(
    @Param() { id }: WaitlistEntryIdParamDto,
    @Body() body: UpdateWaitlistEntryDto,
    @CurrentUser() actor: UserWithRole,
  ) {
    return this.waitlist.update({ actor, id, body });
  }
}
