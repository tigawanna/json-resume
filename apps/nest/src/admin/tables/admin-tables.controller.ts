import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiNotImplementedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../auth/helpers/auth.decorators.js';
import type { UserWithRole } from '../../auth/helpers/utils.js';
import { ApiAuthResponses } from '../../shared/openapi/auth-responses.decorator.js';
import { ApiErrorDto } from '../../shared/openapi/api-error.dto.js';
import { AdminTableBrowserService } from './admin-table-browser.service.js';
import { AdminRowDeleteService } from './admin-row-delete.service.js';
import { AdminRowService } from './admin-row.service.js';
import { AdminRowReadService } from './admin-row-read.service.js';
import { AdminTruncateService } from './admin-truncate.service.js';
import {
  AdminRowDto,
  AdminRowDeleteResultDto,
  AdminRowUpdateResultDto,
  AdminRowParamDto,
  AdminTableDto,
  AdminTablePageDto,
  AdminTablePageQueryDto,
  AdminTableParamDto,
  AdminTruncatePreviewDto,
  AdminTruncatePreviewQueryDto,
  AdminTruncateResultDto,
  TruncateAdminTableDto,
  UpdateAdminRowDto,
} from './admin-tables.dto.js';
import type { TruncateCutoff } from './admin-truncate.types.js';

@Roles({ roles: ['admin'] })
@ApiTags('admin')
@ApiCookieAuth()
@ApiAuthResponses({ forbiddenDescription: 'Admin role required' })
@ApiBadRequestResponse({ type: ApiErrorDto })
@Controller('admin/tables')
export class AdminTablesController {
  constructor(
    private readonly browser: AdminTableBrowserService,
    private readonly readRows: AdminRowReadService,
    private readonly rows: AdminRowService,
    private readonly deleteRows: AdminRowDeleteService,
    private readonly truncate: AdminTruncateService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List database tables and their columns' })
  @ApiOkResponse({ type: AdminTableDto, isArray: true })
  list() {
    return this.browser.list();
  }

  @Get(':table/rows/:rowid')
  @ApiOperation({ summary: 'Inspect a database row' })
  @ApiOkResponse({ type: AdminRowDto })
  @ApiNotFoundResponse({ description: 'Table or row not found', type: ApiErrorDto })
  readRow(@Param() { table, rowid }: AdminRowParamDto) {
    return this.readRows.read({ table, rowid });
  }

  @Patch(':table/rows/:rowid')
  @ApiOperation({ summary: 'Update editable cells in a database row' })
  @ApiOkResponse({ type: AdminRowUpdateResultDto })
  @ApiBadRequestResponse({
    description: 'Read-only table or invalid column/value',
    type: ApiErrorDto,
  })
  updateRow(
    @Param() { table, rowid }: AdminRowParamDto,
    @Body() body: UpdateAdminRowDto,
    @CurrentUser() actor: UserWithRole,
  ) {
    return this.rows.update({ actor, table, rowid, values: body.values });
  }

  @Delete(':table/rows/:rowid')
  @ApiOperation({
    summary: 'Delete a database row and its owned sync children',
  })
  @ApiOkResponse({ type: AdminRowDeleteResultDto })
  @ApiBadRequestResponse({ description: 'Read-only table or referencing rows', type: ApiErrorDto })
  deleteRow(
    @Param() { table, rowid }: AdminRowParamDto,
    @CurrentUser() actor: UserWithRole,
  ) {
    return this.deleteRows.remove({ actor, table, rowid });
  }

  @Get(':table/truncate')
  @ApiOperation({
    summary: 'Preview truncating a table or rows older than a cutoff',
  })
  @ApiOkResponse({ type: AdminTruncatePreviewDto })
  previewTruncate(
    @Param() { table }: AdminTableParamDto,
    @Query() query: AdminTruncatePreviewQueryDto,
  ) {
    let cutoff: TruncateCutoff | undefined;
    if (query.column !== undefined && query.before !== undefined)
      cutoff = { column: query.column, before: query.before };
    return this.truncate.preview({ table, cutoff });
  }

  @Post(':table/truncate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Truncate a table or rows older than a cutoff' })
  @ApiOkResponse({ type: AdminTruncateResultDto })
  @ApiBadRequestResponse({
    description: 'Confirmation mismatch, read-only table or blocked references',
    type: ApiErrorDto,
  })
  @ApiNotImplementedResponse({
    description: 'Event-log operations require Nest sync projection',
    type: ApiErrorDto,
  })
  truncateTable(
    @Param() { table }: AdminTableParamDto,
    @Body() body: TruncateAdminTableDto,
    @CurrentUser() actor: UserWithRole,
  ) {
    return this.truncate.truncate({
      actor,
      table,
      confirm: body.confirm,
      cutoff: body.cutoff,
      rebuild: body.rebuild,
    });
  }

  @Get(':table')
  @ApiOperation({ summary: 'Browse a paginated database table' })
  @ApiOkResponse({ type: AdminTablePageDto })
  @ApiNotFoundResponse({ description: 'Table not found', type: ApiErrorDto })
  tablePage(
    @Param() { table }: AdminTableParamDto,
    @Query() query: AdminTablePageQueryDto,
  ) {
    return this.browser.page({
      table,
      page: query.page,
      pageSize: query.pageSize,
      q: query.q,
    });
  }
}
