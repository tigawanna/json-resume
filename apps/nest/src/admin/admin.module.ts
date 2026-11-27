import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { SyncModule } from '../sync/sync.module.js';
import { AdminAuditService } from './audit/admin-audit.service.js';
import { AdminCreditsController } from './credits/admin-credits.controller.js';
import { AdminCreditsService } from './credits/admin-credits.service.js';
import { AdminEventLogController } from './event-log/admin-event-log.controller.js';
import { AdminEventLogService } from './event-log/admin-event-log.service.js';
import { EventLogBackupService } from './event-log/event-log-backup.service.js';
import { EventLogRebuildService } from './event-log/event-log-rebuild.service.js';
import { EventLogRebuildRows } from './event-log/event-log-rebuild-rows.service.js';
import { EventLogSquashService } from './event-log/event-log-squash.service.js';
import { AdminSessionController } from './session/admin-session.controller.js';
import { AdminStatsController } from './stats/admin-stats.controller.js';
import { AdminStatsService } from './stats/admin-stats.service.js';
import { AdminTableBrowserService } from './tables/admin-table-browser.service.js';
import { AdminTableMetadataService } from './tables/admin-table-metadata.service.js';
import { AdminRowDeleteService } from './tables/admin-row-delete.service.js';
import { AdminRowService } from './tables/admin-row.service.js';
import { AdminRowReadService } from './tables/admin-row-read.service.js';
import { AdminTablesController } from './tables/admin-tables.controller.js';
import { AdminTruncateService } from './tables/admin-truncate.service.js';
import { AdminTruncateEventLogService } from './tables/admin-truncate-event-log.service.js';
import { AdminUsersController } from './users/admin-users.controller.js';
import { AdminUsersService } from './users/admin-users.service.js';
import { AdminWaitlistController } from './waitlist/admin-waitlist.controller.js';
import { AdminWaitlistQueryService } from './waitlist/admin-waitlist-query.service.js';
import { AdminWaitlistService } from './waitlist/admin-waitlist.service.js';

@Module({
  imports: [DatabaseModule, CreditsModule, SyncModule],
  controllers: [
    AdminWaitlistController,
    AdminCreditsController,
    AdminSessionController,
    AdminStatsController,
    AdminUsersController,
    AdminTablesController,
    AdminEventLogController,
  ],
  providers: [
    AdminWaitlistService,
    AdminWaitlistQueryService,
    AdminCreditsService,
    AdminAuditService,
    AdminStatsService,
    AdminUsersService,
    AdminTableMetadataService,
    AdminTableBrowserService,
    AdminRowReadService,
    AdminRowService,
    AdminRowDeleteService,
    AdminTruncateService,
    AdminTruncateEventLogService,
    AdminEventLogService,
    EventLogBackupService,
    EventLogRebuildService,
    EventLogRebuildRows,
    EventLogSquashService,
  ],
})
export class AdminModule {}
