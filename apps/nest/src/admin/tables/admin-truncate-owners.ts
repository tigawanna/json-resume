import { resume } from "@repo/db/postgres/schema/resume";
import { getTableColumns, getTableName } from "drizzle-orm";
import type { DrizzleDB } from "../../database/database.module.js";
import { parentOwnershipFor } from "./admin-row-ownership.js";
import type { CollectionId } from "./admin-table-registry.js";

type Row = Record<string, unknown>;
type OwnerRow = { id: string; userId: string };

export function createOwnerResolver({ db }: { db: DrizzleDB }) {
  const pendingOwners = new Map<string, Promise<Map<string, string>>>();
  const ownersOfTable = ({ key, load }: { key: string; load: () => Promise<OwnerRow[]> }) => {
    let pending = pendingOwners.get(key);
    if (!pending) {
      pending = load().then((rows) => new Map(rows.map((row) => [row.id, row.userId])));
      pendingOwners.set(key, pending);
    }
    return pending;
  };

  return async ({
    collectionId,
    row,
  }: {
    collectionId: CollectionId;
    row: Row;
  }): Promise<string | null> => {
    if (typeof row.userId === "string") return row.userId;
    if (typeof row.resumeId === "string") {
      const owners = await ownersOfTable({
        key: "resume",
        load: async () =>
          (await db.select({ id: resume.id, userId: resume.userId }).from(resume)).flatMap((row) =>
            typeof row.id === "string" && typeof row.userId === "string" ? [row] : [],
          ),
      });
      return owners.get(row.resumeId) ?? null;
    }
    const via = parentOwnershipFor({ collectionId });
    const parentId = via ? row[via.column] : undefined;
    if (!via || typeof parentId !== "string") return null;
    const columns = getTableColumns(via.parent);
    if (!columns.id || !columns.userId) return null;
    const owners = await ownersOfTable({
      key: getTableName(via.parent),
      load: async () =>
        (await db.select({ id: columns.id, userId: columns.userId }).from(via.parent)).flatMap(
          (row) =>
            typeof row.id === "string" && typeof row.userId === "string"
              ? [{ id: row.id, userId: row.userId }]
              : [],
        ),
    });
    return owners.get(parentId) ?? null;
  };
}
