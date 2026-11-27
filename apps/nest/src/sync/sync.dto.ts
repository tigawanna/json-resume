import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { isCollectionId } from '../admin/tables/admin-table-registry.js';

const jsonRecord = z.record(z.string(), z.unknown());

export const outboundEventSchema = z.object({
  eventId: z.string().min(1),
  collectionId: z.string().min(1),
  type: z.enum(['insert', 'update', 'delete']),
  key: z.union([z.string(), z.number()]),
  payload: jsonRecord,
  previous: jsonRecord.nullable().optional(),
  txId: z.string().min(1),
  clientId: z.string().min(1),
  schemaVersion: z.number().int(),
  timestamp: z.number().int(),
  baseVersion: z.string().nullable().optional(),
});
export type OutboundEvent = z.infer<typeof outboundEventSchema>;

export class OutboundEventDto extends createZodDto(outboundEventSchema) {}
export class OutboundEventBatchDto extends createZodDto(
  z.array(outboundEventSchema),
) {}

export class SyncEventsQueryDto extends createZodDto(
  z.object({ since: z.coerce.number().int().min(0).default(0) }),
) {}

const pushFailure = z.object({
  eventId: z.string(),
  message: z.string(),
  code: z.string().optional(),
  retryable: z.boolean().optional(),
});
export class PushFailureDto extends createZodDto(pushFailure) {}

export class PushResponseDto extends createZodDto(
  z.object({
    confirmed: z.array(
      z.object({ eventId: z.string(), globalSeq: z.number().int().nonnegative() }),
    ),
    failed: z.array(pushFailure).optional(),
  }),
) {}

export class ServerEventDto extends createZodDto(
  z.object({
    globalSeq: z.number().int().positive(),
    eventId: z.string(),
    collectionId: z.string(),
    type: z.enum(['insert', 'update', 'delete']),
    key: z.string(),
    payload: jsonRecord,
    previous: jsonRecord.nullable(),
    txId: z.string(),
    clientId: z.string(),
    schemaVersion: z.number().int(),
    timestamp: z.number().int(),
    cursor: z.string(),
  }),
) {}

export class PullResponseDto extends createZodDto(
  z.object({
    events: z.array(
      z.object({
        globalSeq: z.number().int().positive(),
        eventId: z.string(),
        collectionId: z.string(),
        type: z.enum(['insert', 'update', 'delete']),
        key: z.string(),
        payload: jsonRecord,
        previous: jsonRecord.nullable(),
        txId: z.string(),
        clientId: z.string(),
        schemaVersion: z.number().int(),
        timestamp: z.number().int(),
        cursor: z.string(),
      }),
    ),
    cursor: z.string(),
    hasMore: z.boolean(),
    backendId: z.string(),
  }),
) {}

const compactionOp = z
  .object({
    collectionId: z.string().refine(isCollectionId, { message: 'Not a compactable collection' }),
    type: z.enum(['update', 'delete']),
    id: z.string().min(1),
    row: jsonRecord,
  })
  .refine((op) => op.row.id === op.id, { message: 'row.id must match id' });

export const compactionProposalSchema = z.object({
  compactionId: z.string().min(1),
  baseSeq: z.number().int().min(0),
  prune: z.boolean(),
  merged: z.record(z.string(), z.number().int().min(0)),
  pruned: z.record(z.string(), z.number().int().min(0)),
  ops: z.array(compactionOp).min(1).max(5000),
});
export type CompactionProposal = z.infer<typeof compactionProposalSchema>;
export class CompactionProposalDto extends createZodDto(compactionProposalSchema) {}

export class CompactionOutcomeDto extends createZodDto(
  z.object({
    status: z.enum(['accepted', 'stale']),
    events: z.number().int().positive().optional(),
  }),
) {}
