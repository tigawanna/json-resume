import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { compactAllLibraries, compactUserLibrary } from "../sync/compact.server";
import { squashSyncEvents } from "../sync/squash.server";
import { adminEventFilterSchema, adminEventListSchema } from "./admin-event-filters";
import {
  readAdminEvents,
  readAdminEventsByCollection,
  readAdminEventUsers,
} from "./admin-events.server";
import { deleteAdminRow, readAdminRow, updateAdminRow } from "./admin-row-edit.server";
import { readAdminStats } from "./admin-stats.server";
import { listAdminTables, readAdminTablePage } from "./admin-tables.server";
import { previewTruncate, truncateAdminTable } from "./admin-truncate.server";
import { listAdminUsers } from "./admin-users.server";
import {
  backupAndEmptyEventLog,
  dropEventLogBackup,
  EVENT_LOG_TABLE,
  listEventLogBackups,
  restoreEventLogBackup,
} from "./event-log-backup.server";
import {
  catchUpProjection,
  rebuildAllEventLogs,
  rebuildUserEventLog,
} from "./rebuild-event-log.server";

const adminMiddleware = createMiddleware()
  .middleware([viewerMiddleware])
  .server(async ({ next, context }) => {
    if (context.viewer.user.role !== "admin") throw new Error("Admin access required");
    return next();
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => readAdminStats());

export const getAdminTables = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => listAdminTables());

export const getAdminTablePage = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      table: z.string().min(1),
      page: z.number().int().min(0),
      pageSize: z.number().int().min(1).max(200),
      q: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => readAdminTablePage(data));

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => listAdminUsers());

export const getAdminEvents = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(adminEventListSchema)
  .handler(async ({ data }) => readAdminEvents(data));

export const getAdminEventsByCollection = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(adminEventFilterSchema)
  .handler(async ({ data }) => readAdminEventsByCollection(data));

export const getAdminEventUsers = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => readAdminEventUsers());

const rowRefSchema = z.object({
  table: z.string().min(1),
  rowid: z.number().int(),
});

export const getAdminRow = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(rowRefSchema)
  .handler(async ({ data }) => readAdminRow(data));

export const updateAdminRowFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(rowRefSchema.extend({ values: z.record(z.string(), z.string().nullable()) }))
  .handler(async ({ data }) => updateAdminRow(data));

export const deleteAdminRowFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(rowRefSchema)
  .handler(async ({ data }) => deleteAdminRow(data));

const truncateCutoffSchema = z
  .object({ column: z.string().min(1), before: z.number().int() })
  .optional();

export const getAdminTruncatePreview = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(z.object({ table: z.string().min(1), cutoff: truncateCutoffSchema }))
  .handler(async ({ data }) => previewTruncate(data));

export const truncateAdminTableFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      table: z.string().min(1),
      confirm: z.string(),
      cutoff: truncateCutoffSchema,
      rebuild: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => truncateAdminTable(data));

export const restoreEventLogBackupFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ table: z.string().min(1) }))
  .handler(async ({ data }) => restoreEventLogBackup(data.table));

export const dropEventLogBackupFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ table: z.string().min(1), confirm: z.string() }))
  .handler(async ({ data }) => {
    if (data.confirm !== data.table) throw new Error("Type the backup name to confirm");
    return dropEventLogBackup(data.table);
  });

export const squashEventLogFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      userId: z.string().min(1).optional(),
      retentionMs: z.number().int().min(0).optional(),
      dryRun: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => squashSyncEvents(data));

export const projectPendingEventsFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async () => ({ projected: await catchUpProjection() }));

export const compactLibraryFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ userId: z.string().min(1).optional() }))
  .handler(async ({ data }) =>
    data.userId ? { users: 1, ...(await compactUserLibrary(data.userId)) } : compactAllLibraries(),
  );

export const rebuildAllEventLogsFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async () => rebuildAllEventLogs());

export const getEventLogBackups = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => listEventLogBackups());

export const backupAndEmptyEventLogFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ confirm: z.string(), rebuild: z.boolean().optional() }))
  .handler(async ({ data }) => {
    if (data.confirm !== EVENT_LOG_TABLE) throw new Error(`Type ${EVENT_LOG_TABLE} to confirm`);
    const emptied = await backupAndEmptyEventLog();
    const rebuilt = data.rebuild ? await rebuildAllEventLogs() : null;
    return {
      ...emptied,
      rebuiltEvents: rebuilt?.insertedEvents ?? 0,
      rebuiltUsers: rebuilt?.users ?? 0,
    };
  });

export const rebuildEventLog = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => rebuildUserEventLog(data.userId));
