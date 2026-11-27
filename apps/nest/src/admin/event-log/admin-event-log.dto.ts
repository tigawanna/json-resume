import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const backupTable = z
  .string()
  .min(1)
  .max(100)
  .regex(/^sync_event_backup_\d{14}$/, 'Expected an event log backup table');
export class EventLogBackupParamDto extends createZodDto(
  z.object({ table: backupTable }),
) {}

export class EventLogBackupDto extends createZodDto(
  z.object({
    table: z.string(),
    rows: z.number().int().nonnegative(),
    createdAt: z.number().int().nonnegative(),
  }),
) {}

export class EventLogBackupResultDto extends createZodDto(
  z.object({ backup: z.string(), rows: z.number().int().nonnegative() }),
) {}

export class RestoreEventLogBackupDto extends createZodDto(
  z.object({ restored: z.number().int().nonnegative() }),
) {}

export class DropEventLogBackupDto extends createZodDto(
  z.object({
    table: z.string(),
    confirm: z.string().min(1).max(100),
  }),
) {}

export class DropEventLogBackupResultDto extends createZodDto(
  z.object({ dropped: z.string() }),
) {}

export class EmptyEventLogDto extends createZodDto(
  z.object({
    confirm: z.string().min(1).max(100),
    rebuild: z.boolean().optional(),
  }),
) {}

export class EmptyEventLogResultDto extends createZodDto(
  z.object({
    backup: z.string(),
    deleted: z.number().int().nonnegative(),
    rebuiltEvents: z.number().int().nonnegative(),
    rebuiltUsers: z.number().int().nonnegative(),
  }),
) {}

export class ProjectionResultDto extends createZodDto(
  z.object({ projected: z.number().int().nonnegative() }),
) {}

export class RebuildEventLogParamDto extends createZodDto(
  z.object({ userId: z.string().min(1).max(64) }),
) {}

export class RebuildEventLogResultDto extends createZodDto(
  z.object({
    previousEvents: z.number().int().nonnegative(),
    insertedEvents: z.number().int().nonnegative(),
    projectedFirst: z.number().int().nonnegative(),
    byCollection: z.record(z.string(), z.number().int().nonnegative()),
  }),
) {}

export class RebuildAllEventLogsResultDto extends createZodDto(
  z.object({
    users: z.number().int().nonnegative(),
    previousEvents: z.number().int().nonnegative(),
    insertedEvents: z.number().int().nonnegative(),
    orphanEvents: z.number().int().nonnegative(),
    projectedFirst: z.number().int().nonnegative(),
  }),
) {}

export class SquashEventLogDto extends createZodDto(
  z.object({
    userId: z.string().min(1).max(64).optional(),
    retentionMs: z.number().int().min(0).optional(),
    dryRun: z.boolean().optional(),
  }),
) {}

export class SquashEventLogResultDto extends createZodDto(
  z.object({
    users: z.number().int().nonnegative(),
    scanned: z.number().int().nonnegative(),
    removed: z.number().int().nonnegative(),
    reasons: z.object({ superseded: z.number().int(), deleted: z.number().int() }),
    before: z.number().int(),
  }),
) {}
