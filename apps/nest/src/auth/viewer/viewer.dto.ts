import { sessionZod, userZod } from '@repo/db/zod';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const viewerUser = userZod.select
  .pick({
    id: true,
    name: true,
    email: true,
    emailVerified: true,
    image: true,
    role: true,
    banned: true,
    banReason: true,
    banExpires: true,
  })
  .extend({
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    banExpires: z.iso.datetime().nullable(),
  });

const viewerSession = sessionZod.select
  .pick({
    id: true,
    userId: true,
    expiresAt: true,
    createdAt: true,
    updatedAt: true,
    ipAddress: true,
    userAgent: true,
    impersonatedBy: true,
    activeOrganizationId: true,
  })
  .extend({
    expiresAt: z.iso.datetime(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  });

const viewerResponse = z.object({
  user: viewerUser,
  session: viewerSession,
});

export class ViewerResponseDto extends createZodDto(viewerResponse) {}
export type ViewerResponse = z.infer<typeof viewerResponse>;
