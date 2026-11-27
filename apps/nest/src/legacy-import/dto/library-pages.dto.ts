import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  certificationListItemSchema,
  contactListItemSchema,
  educationListItemSchema,
  experienceListItemSchema,
  languageListItemSchema,
  linkListItemSchema,
  projectListItemSchema,
  skillGroupListItemSchema,
  summaryListItemSchema,
  talkListItemSchema,
  volunteerListItemSchema,
} from './library-items.dto.js';

function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().optional(),
    previousCursor: z.string().optional(),
  });
}

export class TalkPageDto extends createZodDto(pageSchema(talkListItemSchema)) {}
export class LinkPageDto extends createZodDto(pageSchema(linkListItemSchema)) {}
export class ProjectPageDto extends createZodDto(
  pageSchema(projectListItemSchema),
) {}
export class CertificationPageDto extends createZodDto(
  pageSchema(certificationListItemSchema),
) {}
export class LanguagePageDto extends createZodDto(
  pageSchema(languageListItemSchema),
) {}
export class SkillGroupPageDto extends createZodDto(
  pageSchema(skillGroupListItemSchema),
) {}
export class ExperiencePageDto extends createZodDto(
  pageSchema(experienceListItemSchema),
) {}
export class EducationPageDto extends createZodDto(
  pageSchema(educationListItemSchema),
) {}
export class VolunteerPageDto extends createZodDto(
  pageSchema(volunteerListItemSchema),
) {}
export class ContactPageDto extends createZodDto(
  pageSchema(contactListItemSchema),
) {}
export class SummaryPageDto extends createZodDto(
  pageSchema(summaryListItemSchema),
) {}
