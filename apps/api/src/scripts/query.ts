import { db } from "@api/db/client";
import { user } from "@repo/db/schema/auth-schema";
import { syncEvent } from "@repo/db/schema/sync-schema";
import "dotenv/config";
import { eq, getTableColumns } from "drizzle-orm";

await db.query.syncEvent.findMany({
  with: {
    user: true,
  },
  columns: {
    payload: false,
  },
  limit: 2,
});

// console.dir(syncEvents, { depth: null });

const { payload: _payload, ...eventColumns } = getTableColumns(syncEvent);

const rows = await db
  .select({
    ...eventColumns,
    user,
  })
  .from(syncEvent)
  .innerJoin(user, eq(syncEvent.userId, user.id))
  .limit(2);

console.dir(rows, { depth: null }); 
