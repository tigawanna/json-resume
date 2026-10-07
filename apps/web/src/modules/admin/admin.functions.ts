import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminEventFilterSchema, adminEventListSchema } from "./admin-event-filters";
import {
  readAdminEvents,
  readAdminEventsByCollection,
  readAdminEventUsers,
} from "./admin-events.server";
import { deleteAdminRow, readAdminRow, updateAdminRow } from "./admin-row-edit.server";
import { readAdminStats } from "./admin-stats.server";
import { listAdminTables, readAdminTablePage } from "./admin-tables.server";
import { listAdminUsers } from "./admin-users.server";
import { rebuildUserEventLog } from "./rebuild-event-log.server";

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
  .inputValidator(
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
  .inputValidator(adminEventListSchema)
  .handler(async ({ data }) => readAdminEvents(data));

export const getAdminEventsByCollection = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .inputValidator(adminEventFilterSchema)
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
  .inputValidator(rowRefSchema)
  .handler(async ({ data }) => readAdminRow(data));

export const updateAdminRowFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(rowRefSchema.extend({ values: z.record(z.string(), z.string().nullable()) }))
  .handler(async ({ data }) => updateAdminRow(data));

export const deleteAdminRowFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(rowRefSchema)
  .handler(async ({ data }) => deleteAdminRow(data));

export const rebuildEventLog = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => rebuildUserEventLog(data.userId));
