import { BadRequestException, Injectable } from '@nestjs/common';
import { getTableName } from 'drizzle-orm';
import { syncEvent } from '@repo/db/schema/sync-schema';
import {
  AdminAuditService,
  type AdminActor,
} from '../audit/admin-audit.service.js';
import type {
  DropEventLogBackupDto,
  EmptyEventLogDto,
  SquashEventLogDto,
} from './admin-event-log.dto.js';
import { EventLogBackupService } from './event-log-backup.service.js';
import { EventLogProjectionService } from '../../sync/event-log-projection.service.js';
import { EventLogRebuildService } from './event-log-rebuild.service.js';
import { EventLogSquashService } from './event-log-squash.service.js';

const EVENT_LOG_TABLE = getTableName(syncEvent);

@Injectable()
export class AdminEventLogService {
  constructor(
    private readonly backups: EventLogBackupService,
    private readonly projection: EventLogProjectionService,
    private readonly rebuild: EventLogRebuildService,
    private readonly squash: EventLogSquashService,
    private readonly audit: AdminAuditService,
  ) {}

  listBackups() {
    return this.backups.list();
  }

  createBackup({ actor }: { actor: AdminActor }) {
    return this.audit.run({
      action: 'create-event-log-backup',
      actor,
      input: {},
      execute: () => this.backups.create(),
    });
  }

  restoreBackup({ actor, table }: { actor: AdminActor; table: string }) {
    return this.audit.run({
      action: 'restore-event-log-backup',
      actor,
      input: { table },
      execute: () => this.backups.restore({ table }),
    });
  }

  dropBackup({ actor, body }: { actor: AdminActor; body: DropEventLogBackupDto }) {
    return this.audit.run({
      action: 'drop-event-log-backup',
      actor,
      input: { table: body.table },
      execute: () => {
        if (body.confirm !== body.table)
          throw new BadRequestException('Type the backup name to confirm');
        return this.backups.drop({ table: body.table });
      },
    });
  }

  empty({ actor, body }: { actor: AdminActor; body: EmptyEventLogDto }) {
    return this.audit.run({
      action: 'backup-and-empty-event-log',
      actor,
      input: { rebuild: body.rebuild },
      execute: () => this.emptyLog({ body }),
    });
  }

  project({ actor }: { actor: AdminActor }) {
    return this.audit.run({
      action: 'project-pending-events',
      actor,
      input: {},
      execute: async () => ({ projected: await this.projection.catchUp() }),
    });
  }

  rebuildUser({ actor, userId }: { actor: AdminActor; userId: string }) {
    return this.audit.run({
      action: 'rebuild-event-log',
      actor,
      input: { userId },
      execute: () => this.rebuild.user({ userId }),
    });
  }

  rebuildAll({ actor }: { actor: AdminActor }) {
    return this.audit.run({
      action: 'rebuild-all-event-logs',
      actor,
      input: {},
      execute: () => this.rebuild.all(),
    });
  }

  squashLog({ actor, body }: { actor: AdminActor; body: SquashEventLogDto }) {
    return this.audit.run({
      action: 'squash-event-log',
      actor,
      input: { userId: body.userId, retentionMs: body.retentionMs, dryRun: body.dryRun },
      execute: () =>
        this.squash.run({
          userId: body.userId,
          retentionMs: body.retentionMs,
          dryRun: body.dryRun,
        }),
    });
  }

  private async emptyLog({ body }: { body: EmptyEventLogDto }) {
    if (body.confirm !== EVENT_LOG_TABLE)
      throw new BadRequestException(`Type ${EVENT_LOG_TABLE} to confirm`);
    const emptied = await this.backups.backupAndEmpty();
    const rebuilt = body.rebuild ? await this.rebuild.all() : null;
    return {
      ...emptied,
      rebuiltEvents: rebuilt?.insertedEvents ?? 0,
      rebuiltUsers: rebuilt?.users ?? 0,
    };
  }
}
