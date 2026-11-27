import { userZod } from '@repo/db/postgres/zod';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const adminUser = userZod.select
  .pick({
    id: true,
    name: true,
    email: true,
    role: true,
    emailVerified: true,
    banned: true,
  })
  .extend({
    createdAt: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    resumes: z.number().int().nonnegative(),
  });

export class AdminUserDto extends createZodDto(adminUser) {}
export type AdminUser = z.infer<typeof adminUser>;
