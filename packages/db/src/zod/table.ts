import type { Table } from "drizzle-orm";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

export { createInsertSchema, createSelectSchema, createUpdateSchema };

/** Select / insert / update Zod objects for one Drizzle table. Refine in DTOs with `.pick` / `.extend`. */
export function drizzleZod<TTable extends Table>({ table }: { table: TTable }) {
  return {
    select: createSelectSchema(table),
    insert: createInsertSchema(table),
    update: createUpdateSchema(table),
  };
}
