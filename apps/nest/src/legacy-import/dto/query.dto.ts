import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const listQuery = z.object({
  keyword: z.string().optional(),
  cursor: z.string().optional(),
  direction: z.enum(['after', 'before']).default('after'),
});

export class LegacyImportListQueryDto extends createZodDto(listQuery) {}

export class LegacyImportResumeListQueryDto extends createZodDto(
  z.object({
    id: z.string().optional(),
    keyword: z.string().optional(),
  }),
) {}

export class LegacyImportResumeIdParamDto extends createZodDto(
  z.object({ id: z.string().min(1) }),
) {}
