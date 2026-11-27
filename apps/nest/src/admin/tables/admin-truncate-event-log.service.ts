import { Injectable } from '@nestjs/common';
import { EventLogBackupService } from '../event-log/event-log-backup.service.js';
import { EventLogProjectionService } from '../../sync/event-log-projection.service.js';
import { EventLogRebuildService } from '../event-log/event-log-rebuild.service.js';

export type EventLogTruncateResult = {
  mode: 'eventLog';
  deleted: number;
  backup: string;
  references: number;
  events: number;
  users: number;
};

@Injectable()
export class AdminTruncateEventLogService {
  constructor(
    private readonly backups: EventLogBackupService,
    private readonly projection: EventLogProjectionService,
    private readonly rebuild: EventLogRebuildService,
  ) {}

  preview() {
    return this.backups.list();
  }

  async truncate({ rebuild = false }: { rebuild?: boolean }): Promise<EventLogTruncateResult> {
    await this.projection.catchUp();
    const emptied = await this.backups.backupAndEmpty();
    const rebuilt = rebuild ? await this.rebuild.all() : null;
    return {
      mode: 'eventLog',
      deleted: emptied.deleted,
      backup: emptied.backup,
      references: 0,
      events: rebuilt?.insertedEvents ?? 0,
      users: rebuilt?.users ?? 0,
    };
  }
}
