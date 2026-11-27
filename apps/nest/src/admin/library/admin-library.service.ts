import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { compactionRequestEvent } from '@repo/isomorphic/sync/compaction-protocol';
import { user } from '@repo/db/postgres/schema/auth-schema';
import { syncEvent } from '@repo/db/postgres/schema/sync-schema';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module.js';
import {
  AdminAuditService,
  type AdminActor,
} from '../audit/admin-audit.service.js';
import { EventLogBackupService } from '../event-log/event-log-backup.service.js';
import type { AdminLibraryActionDto } from './admin-library.dto.js';

@Injectable()
export class AdminLibraryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly backups: EventLogBackupService,
    private readonly audit: AdminAuditService,
  ) {}

  compact({ actor, body }: { actor: AdminActor; body: AdminLibraryActionDto }) {
    return this.audit.run({
      action: 'compact-library',
      actor,
      input: { userId: body.userId },
      execute: async () => ({
        users: await this.appendRequests({ userId: body.userId, prune: false }),
      }),
    });
  }

  prune({ actor, body }: { actor: AdminActor; body: AdminLibraryActionDto }) {
    return this.audit.run({
      action: 'prune-library',
      actor,
      input: { userId: body.userId },
      execute: async () => {
        const backup = await this.backups.create();
        const users = await this.appendRequests({
          userId: body.userId,
          prune: true,
        });
        return { backup: backup.backup, users };
      },
    });
  }

  private async appendRequests({
    userId,
    prune,
  }: {
    userId?: string;
    prune: boolean;
  }) {
    const userIds = userId
      ? [userId]
      : (
          await this.db
            .selectDistinct({ userId: syncEvent.userId })
            .from(syncEvent)
        ).map((row) => row.userId);
    if (userIds.length === 0) return 0;
    if (userId) {
      const [owner] = await this.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      if (!owner) throw new NotFoundException('User not found');
    }

    const txId = crypto.randomUUID();
    const timestamp = Date.now();
    const rows = userIds.map((owner) => {
      const event = compactionRequestEvent(prune);
      return {
        eventId: event.eventId,
        userId: owner,
        collectionId: event.collectionId,
        type: event.type,
        key: event.key,
        payload: JSON.stringify(event.payload),
        previous: JSON.stringify(event.previous),
        txId,
        clientId: 'admin',
        schemaVersion: 1,
        clientTimestamp: timestamp,
      };
    });
    await this.db.insert(syncEvent).values(rows);
    return userIds.length;
  }
}
