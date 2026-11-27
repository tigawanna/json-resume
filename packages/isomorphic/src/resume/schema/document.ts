import { z } from "zod";
import { SECTION_KEYS, TEMPLATE_IDS } from "./constants.ts";

const linkPair = z.object({
  label: z.string(),
  url: z.string(),
});

const headerContact = z.object({
  type: z.string(),
  value: z.string(),
  label: z.string(),
});

const headerBlock = z.object({
  enabled: z.boolean(),
  fullName: z.string(),
  headline: z.string(),
  email: z.string(),
  location: z.string(),
  /** Header contacts beyond email / location — phone, address, website… */
  contacts: z.array(headerContact).optional(),
  links: z.array(linkPair),
});

const summaryBlock = z.object({
  enabled: z.boolean(),
  text: z.string(),
});

const experienceItem = z.object({
  company: z.string(),
  role: z.string(),
  start: z.string(),
  end: z.string(),
  location: z.string().optional(),
  bullets: z.array(z.string()),
});

const experienceBlock = z.object({
  enabled: z.boolean(),
  items: z.array(experienceItem),
});

const educationItem = z.object({
  school: z.string(),
  degree: z.string(),
  field: z.string().optional(),
  year: z.string(),
  description: z.string().optional(),
  bullets: z.array(z.string()).optional(),
});

const educationBlock = z.object({
  enabled: z.boolean(),
  items: z.array(educationItem),
});

export const projectItemSchema = z.object({
  name: z.string(),
  url: z.string(),
  homepageUrl: z.string().optional(),
  description: z.string(),
  tech: z.array(z.string()),
});

export type ResumeProjectItem = z.infer<typeof projectItemSchema>;

const projectsBlock = z.object({
  enabled: z.boolean(),
  items: z.array(projectItemSchema),
});

const talkItem = z.object({
  title: z.string(),
  event: z.string(),
  date: z.string(),
  links: z.array(linkPair),
});

const talksBlock = z.object({
  enabled: z.boolean(),
  items: z.array(talkItem),
});

const skillsBlock = z.object({
  enabled: z.boolean(),
  groups: z.array(
    z.object({
      name: z.string(),
      items: z.array(z.string()),
    }),
  ),
});

const notesBlock = z.object({
  enabled: z.boolean(),
  /** Printed heading, e.g. "Notes" or "Cover letter" */
  label: z.string(),
  text: z.string(),
});

export const resumeDocumentV1Schema = z.object({
  version: z.literal(1),
  meta: z.object({
    templateId: z.enum(TEMPLATE_IDS),
  }),
  sectionOrder: z.array(z.enum(SECTION_KEYS)),
  header: headerBlock,
  summary: summaryBlock,
  experience: experienceBlock,
  education: educationBlock,
  projects: projectsBlock,
  talks: talksBlock,
  skills: skillsBlock,
  notes: notesBlock,
});

export type ResumeDocumentV1 = z.infer<typeof resumeDocumentV1Schema>;
