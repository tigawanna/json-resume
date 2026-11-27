import type { Table } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

export { createInsertSchema, createSelectSchema, createUpdateSchema };

/** Select / insert / update Zod objects for one Drizzle table. Refine in DTOs with `.pick` / `.extend`. */
export function drizzleZod<TTable extends Table>({ table }: { table: TTable }) {
  return {
    select: createSelectSchema(table),
    insert: createInsertSchema(table),
    update: createUpdateSchema(table),
  };
}

/** Preserve Buffer validation for Postgres bytea columns used by embeddable rows. */
export function drizzleEmbeddableZod<TTable extends Table>({ table }: { table: TTable }) {
  const schemas = drizzleZod({ table });
  const embedding = z.instanceof(Buffer);
  return {
    select: schemas.select.extend({ embedding: embedding.nullable() }),
    insert: schemas.insert.extend({ embedding: embedding.nullable().optional() }),
    update: schemas.update.extend({ embedding: embedding.nullable().optional() }),
  };
}
