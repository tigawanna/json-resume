import { resumeDocumentV1Schema } from '@repo/isomorphic/resume/schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const isoDate = z.iso.datetime();

export const publicResumeDtoSchema = z.object({
  id: z.string(),
  sourceResumeId: z.string(),
  title: z.string(),
  document: resumeDocumentV1Schema,
  publishedAt: isoDate,
  updatedAt: isoDate,
});
export class PublicResumeDto extends createZodDto(publicResumeDtoSchema) {}

export const publicResumeListItemSchema = z.object({
  id: z.string(),
  sourceResumeId: z.string(),
  title: z.string(),
  headline: z.string(),
  publishedAt: isoDate,
  updatedAt: isoDate,
});
export class PublicResumeListItemDto extends createZodDto(
  publicResumeListItemSchema,
) {}

const publicResumeListQuery = z.object({
  keyword: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export class PublicResumeListQueryDto extends createZodDto(
  publicResumeListQuery,
) {}

const sourceResumeId = z.string().min(1).max(255);
export class PublicResumeSourceQueryDto extends createZodDto(
  z.object({ sourceResumeId }),
) {}
export class PublicResumeIdParamDto extends createZodDto(
  z.object({ id: z.string().min(1) }),
) {}

const publishPublicResume = z.object({
  sourceResumeId,
  title: z.string().trim().min(1).max(300),
  document: resumeDocumentV1Schema,
});
export class PublishPublicResumeDto extends createZodDto(publishPublicResume) {}

export class RenamePublicResumeDto extends createZodDto(
  z.object({ title: z.string().trim().min(1).max(300) }),
) {}

export class UnpublishPublicResumeDto extends createZodDto(
  z.object({ sourceResumeId }),
) {}

const publicResumeListResponse = z.object({
  items: z.array(publicResumeListItemSchema),
  total: z.number(),
});
export class PublicResumeListResponseDto extends createZodDto(
  publicResumeListResponse,
) {}

export class PublicResumeMutationResponseDto extends createZodDto(
  z.object({ success: z.boolean() }),
) {}
