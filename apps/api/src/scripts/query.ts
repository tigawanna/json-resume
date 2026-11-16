import "dotenv/config";
import { db } from "@api/db/client";
import { user } from "@repo/db/schema/auth-schema";
import { syncEvent } from "@repo/db/schema/sync-schema";
import { eq, getTableColumns } from "drizzle-orm";

const syncEvents = await db.query.syncEvent.findMany({
  with: {
    user: true,
  },
  columns: {
    payload: false,
  },
  limit: 5,
});

console.dir(syncEvents, { depth: null });

const { payload: _payload, ...eventColumns } = getTableColumns(syncEvent);

await db
  .select({
    event: eventColumns,
    user,
  })
  .from(syncEvent)
  .innerJoin(user, eq(syncEvent.userId, user.id))
  .limit(5);
