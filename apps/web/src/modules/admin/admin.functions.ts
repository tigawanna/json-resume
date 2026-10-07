import { viewerMiddleware } from "@/data-access-layer/auth/viewer";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listAdminTables, readAdminTablePage } from "./admin-tables.server";
import { listUsersWithEventCounts, rebuildUserEventLog } from "./rebuild-event-log.server";

const adminMiddleware = createMiddleware()
  .middleware([viewerMiddleware])
  .server(async ({ next, context }) => {
    if (context.viewer.user.role !== "admin") throw new Error("Admin access required");
    return next();
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const [tables, users] = await Promise.all([listAdminTables(), listUsersWithEventCounts()]);
    return { tables, users };
  });

export const adminTablePageInputSchema = z.object({
  table: z.string().min(1),
  page: z.number().int().min(0),
  pageSize: z.number().int().min(1).max(200),
  q: z.string().optional(),
});

export const getAdminTablePage = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(adminTablePageInputSchema)
  .handler(async ({ data }) => readAdminTablePage(data));

export const rebuildEventLog = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => rebuildUserEventLog(data.userId));
