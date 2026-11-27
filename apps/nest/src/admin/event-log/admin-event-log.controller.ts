import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../../auth/helpers/utils.js';
import { ApiErrorDto } from '../../shared/openapi/api-error.dto.js';
import { ApiAuthResponses } from '../../shared/openapi/auth-responses.decorator.js';
import { AdminEventLogService } from './admin-event-log.service.js';
import {
  DropEventLogBackupDto,
  DropEventLogBackupResultDto,
  EmptyEventLogDto,
  EmptyEventLogResultDto,
  EventLogBackupDto,
  EventLogBackupParamDto,
  EventLogBackupResultDto,
  ProjectionResultDto,
  RebuildAllEventLogsResultDto,
  RebuildEventLogParamDto,
  RebuildEventLogResultDto,
  RestoreEventLogBackupDto,
  SquashEventLogDto,
  SquashEventLogResultDto,
} from './admin-event-log.dto.js';

@Roles({ roles: ['admin'] })
@ApiTags('admin')
@ApiCookieAuth()
@ApiAuthResponses({ forbiddenDescription: 'Admin role required' })
@ApiBadRequestResponse({ type: ApiErrorDto })
@Controller('admin/event-log')
export class AdminEventLogController {
  constructor(private readonly eventLog: AdminEventLogService) {}

  @Get('backups')
  @ApiOperation({ summary: 'List event log backup tables' })
  @ApiOkResponse({ type: EventLogBackupDto, isArray: true })
  listBackups() {
    return this.eventLog.listBackups();
  }

  @Post('backups')
  @HttpCode(200)
  @ApiOperation({ summary: 'Copy the event log into a new backup table' })
  @ApiOkResponse({ type: EventLogBackupResultDto })
  createBackup(@CurrentUser() actor: UserWithRole) {
    return this.eventLog.createBackup({ actor });
  }

  @Post('backups/:table/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Additively restore an event log backup' })
  @ApiOkResponse({ type: RestoreEventLogBackupDto })
  restoreBackup(
    @Param() { table }: EventLogBackupParamDto,
    @CurrentUser() actor: UserWithRole,
  ) {
    return this.eventLog.restoreBackup({ actor, table });
  }

  @Post('backups/:table/drop')
  @HttpCode(200)
  @ApiOperation({ summary: 'Drop an event log backup after confirmation' })
  @ApiOkResponse({ type: DropEventLogBackupResultDto })
  dropBackup(
    @Param() { table }: EventLogBackupParamDto,
    @Body() body: DropEventLogBackupDto,
    @CurrentUser() actor: UserWithRole,
  ) {
    return this.eventLog.dropBackup({
      actor,
      body: { table, confirm: body.confirm },
    });
  }

  @Post('empty')
  @HttpCode(200)
  @ApiOperation({ summary: 'Back up and empty the event log' })
  @ApiOkResponse({ type: EmptyEventLogResultDto })
  empty(@Body() body: EmptyEventLogDto, @CurrentUser() actor: UserWithRole) {
    return this.eventLog.empty({ actor, body });
  }

  @Post('projection')
  @HttpCode(200)
  @ApiOperation({ summary: 'Apply every pending sync event' })
  @ApiOkResponse({ type: ProjectionResultDto })
  project(@CurrentUser() actor: UserWithRole) {
    return this.eventLog.project({ actor });
  }

  @Post('rebuild')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rebuild every user event log from live rows' })
  @ApiOkResponse({ type: RebuildAllEventLogsResultDto })
  rebuildAll(@CurrentUser() actor: UserWithRole) {
    return this.eventLog.rebuildAll({ actor });
  }

  @Post('rebuild/:userId')
  @HttpCode(200)
  @ApiOperation({ summary: "Rebuild one user's event log from live rows" })
  @ApiOkResponse({ type: RebuildEventLogResultDto })
  rebuildUser(
    @Param() { userId }: RebuildEventLogParamDto,
    @CurrentUser() actor: UserWithRole,
  ) {
    return this.eventLog.rebuildUser({ actor, userId });
  }

  @Post('squash')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove superseded events older than the retention window' })
  @ApiOkResponse({ type: SquashEventLogResultDto })
  squash(@Body() body: SquashEventLogDto, @CurrentUser() actor: UserWithRole) {
    return this.eventLog.squashLog({ actor, body });
  }
}
