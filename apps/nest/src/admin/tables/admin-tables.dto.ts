import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const tableName = z.string().min(1).max(255);
const safeInteger = z
  .number()
  .int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);

export const adminColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  notNull: z.boolean(),
  primaryKey: z.boolean(),
});
export type AdminColumn = z.infer<typeof adminColumnSchema>;

export const adminCellSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
export type AdminCell = z.infer<typeof adminCellSchema>;

export const adminRowModeSchema = z.enum(['synced', 'direct', 'readonly']);
export type AdminRowMode = z.infer<typeof adminRowModeSchema>;

export class AdminTableParamDto extends createZodDto(
  z.object({ table: tableName }),
) {}

export class AdminRowParamDto extends createZodDto(
  z.object({ table: tableName, rowid: z.coerce.number().int() }),
) {}

export class AdminTablePageQueryDto extends createZodDto(
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER)
      .default(0),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
    q: z.string().max(500).optional(),
  }),
) {}

export class UpdateAdminRowDto extends createZodDto(
  z.object({ values: z.record(z.string(), z.string().nullable()) }),
) {}

export class AdminTruncatePreviewQueryDto extends createZodDto(
  z
    .object({
      column: z.string().min(1).max(255).optional(),
      before: z.coerce.number().int().optional(),
    })
    .refine(
      ({ column, before }) => (column === undefined) === (before === undefined),
      {
        message: 'column and before must be supplied together',
      },
    ),
) {}

export class TruncateAdminTableDto extends createZodDto(
  z.object({
    confirm: z.string().max(255),
    cutoff: z
      .object({ column: z.string().min(1).max(255), before: safeInteger })
      .optional(),
    rebuild: z.boolean().optional(),
  }),
) {}

export class AdminTableDto extends createZodDto(
  z.object({
    name: z.string(),
    rowCount: z.number(),
    columns: z.array(adminColumnSchema),
  }),
) {}

export class AdminTablePageDto extends createZodDto(
  z.object({
    table: z.string(),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    columns: z.array(adminColumnSchema),
    rows: z.array(
      z.object({
        rowid: z.number(),
        cells: z.record(z.string(), adminCellSchema),
      }),
    ),
  }),
) {}

export class AdminRowDto extends createZodDto(
  z.object({
    table: z.string(),
    rowid: z.number(),
    mode: adminRowModeSchema,
    fields: z.array(
      z.object({
        name: z.string(),
        type: z.string(),
        primaryKey: z.boolean(),
        notNull: z.boolean(),
        value: z.union([z.string(), z.number(), z.null()]),
        kind: z.enum(['value', 'secret', 'binary']),
        editable: z.boolean(),
      }),
    ),
  }),
) {}

export class AdminRowUpdateResultDto extends createZodDto(
  z.object({ mode: z.enum(['synced', 'direct']), changed: z.number() }),
) {}

export class AdminRowDeleteResultDto extends createZodDto(
  z.object({
    mode: z.enum(['synced', 'direct']),
    deletedReferences: z.number(),
  }),
) {}

export class AdminTruncateResultDto extends createZodDto(
  z.object({
    mode: z.enum(['synced', 'direct', 'eventLog']),
    deleted: z.number(),
    references: z.number(),
    events: z.number(),
    backup: z.string().optional(),
    users: z.number().optional(),
  }),
) {}

export class AdminTruncatePreviewDto extends createZodDto(
  z.object({
    table: z.string(),
    mode: z.enum(['synced', 'direct', 'readonly', 'eventLog']),
    backups: z.array(
      z.object({ table: z.string(), rows: z.number(), createdAt: z.number() }),
    ),
    cutoffColumns: z.array(z.string()),
    rows: z.number(),
    references: z.array(z.object({ table: z.string(), rows: z.number() })),
    blockedBy: z.array(
      z.object({ table: z.string(), column: z.string(), rows: z.number() }),
    ),
    cascades: z.array(
      z.object({ table: z.string(), column: z.string(), rows: z.number() }),
    ),
  }),
) {}
