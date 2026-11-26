import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class AdminSessionDto extends createZodDto(
  z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string().nullable(),
  }),
) {}
