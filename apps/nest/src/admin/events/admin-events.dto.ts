import {
  adminEventFilterSchema,
  adminEventListSchema,
} from '@repo/api-contracts/admin/events';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class AdminEventFilterDto extends createZodDto(adminEventFilterSchema) {}
export class AdminEventListQueryDto extends createZodDto(
  adminEventListSchema,
) {}

const adminEvent = z.object({
  globalSeq: z.number(),
  collectionId: z.string(),
  type: z.enum(['insert', 'update', 'delete']),
  key: z.string(),
  clientId: z.string(),
  serverTimestamp: z.number(),
  projectedAt: z.number().nullable(),
  userId: z.string(),
  userEmail: z.string(),
});
export class AdminEventDto extends createZodDto(adminEvent) {}

export class AdminEventListResponseDto extends createZodDto(
  z.object({
    total: z.number(),
    unprojected: z.number(),
    page: z.number(),
    pageSize: z.number(),
    events: z.array(adminEvent),
  }),
) {}

export class AdminEventCollectionDto extends createZodDto(
  z.object({
    collectionId: z.string(),
    total: z.number(),
    unprojected: z.number(),
  }),
) {}

export class AdminEventUserDto extends createZodDto(
  z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string(),
    events: z.number(),
    unprojected: z.number(),
    lastEventAt: z.number().nullable(),
  }),
) {}
