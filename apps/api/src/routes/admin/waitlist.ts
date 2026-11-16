import { requireAdmin } from "@api/auth/middleware";
import { errorBody } from "@api/lib/http";
import type { AppEnv } from "@api/types";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/client";
import { user } from "@repo/db/schema/auth-schema";
import { waitlistEntry } from "@repo/db/schema/credits-schema";
import {
  buildWaitlistCsv,
  listQueryInput,
  readWaitlistExportRows,
  readWaitlistPage,
  readWaitlistStats,
  updateEntryInput,
} from "./waitlist-shared";

export const waitlistAdminRoute = new Hono<AppEnv>()
  /** Paginated, searchable list for the admin waitlist page. */
  .get("/entries", requireAdmin, zValidator("query", listQueryInput), async (c) => {
    const filters = c.req.valid("query");
    const page = await readWaitlistPage(filters);
    return c.json(page);
  })
  /** Counts for the admin home card: waitlist size and linked accounts. */
  .get("/stats", requireAdmin, async (c) => {
    return c.json(await readWaitlistStats());
  })
  /**
   * Row actions: remove/restore, link/unlink account, notes. Every change is
   * audited with before/after on the request wide event.
   */
  .patch(
    "/entries/:id",
    requireAdmin,
    zValidator(
      "param",
      z.object({ id: z.string().min(1).max(64) }),
      (result, c) => {
        if (!result.success) {
          return c.json(errorBody({ message: "Invalid entry id", code: "VALIDATION_ERROR" }), 400);
        }
      },
    ),
    zValidator("json", updateEntryInput, (result, c) => {
      if (!result.success) {
        return c.json(
          errorBody({
            message: "Invalid request body",
            code: "VALIDATION_ERROR",
            issues: result.error.issues,
          }),
          400,
        );
      }
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const patch = c.req.valid("json");
      const log = c.get("log");
      const admin = c.get("session").user;

      if (patch.userId) {
        const [linked] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, patch.userId))
          .limit(1);
        if (!linked) {
          log.audit.deny("Unknown user", {
            action: "waitlist.admin_update",
            actor: { type: "user", id: admin.id, email: admin.email },
            target: { type: "waitlist_entry", id },
          });
          return c.json(errorBody({ message: "Unknown user", code: "NOT_FOUND" }), 404);
        }
      }

      const [before] = await db
        .select()
        .from(waitlistEntry)
        .where(eq(waitlistEntry.id, id))
        .limit(1);
      if (!before) {
        return c.json(errorBody({ message: "Waitlist entry not found", code: "NOT_FOUND" }), 404);
      }

      const [after] = await db
        .update(waitlistEntry)
        .set({
          ...(patch.status === undefined ? {} : { status: patch.status }),
          ...(patch.userId === undefined ? {} : { userId: patch.userId }),
          ...(patch.notes === undefined ? {} : { notes: patch.notes }),
        })
        .where(eq(waitlistEntry.id, id))
        .returning();

      log.audit({
        action: "waitlist.admin_update",
        actor: { type: "user", id: admin.id, email: admin.email },
        target: { type: "waitlist_entry", id },
        outcome: "success",
        changes: {
          before: { status: before.status, userId: before.userId, notes: before.notes },
          after: { status: after!.status, userId: after!.userId, notes: after!.notes },
        },
      });

      return c.json({ entry: after });
    },
  )
  /** CSV export of every entry (including removed), audited. */
  .get("/export", requireAdmin, async (c) => {
    const admin = c.get("session").user;
    const log = c.get("log");

    const rows = await readWaitlistExportRows();
    log.set({ waitlist: { exportRows: rows.length } });
    const csv = buildWaitlistCsv(rows);

    log.audit({
      action: "waitlist.admin_export",
      actor: { type: "user", id: admin.id, email: admin.email },
      target: { type: "waitlist_entry", id: "all" },
      outcome: "success",
    });

    return c.body(csv, 200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="waitlist.csv"',
    });
  });
