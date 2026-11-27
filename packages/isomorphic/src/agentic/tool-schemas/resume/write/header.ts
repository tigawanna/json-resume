import { z } from "zod";
import { linkUrlSchema } from "../../../../links/link-url.ts";
import { targetResumeShape } from "../shared.ts";

const contactViewSchema = z.object({
  id: z.string(),
  type: z.string(),
  value: z.string(),
  label: z.string(),
});

export const setContactsToolInputSchema = z.object({
  ...targetResumeShape,
  contacts: z
    .array(
      z.object({
        type: z.string().trim().min(1).max(40).describe("email, phone, location, website, …"),
        value: z.string().trim().min(1).max(300),
        label: z.string().trim().max(80).optional(),
      }),
    )
    .max(12)
    .describe("Every contact the header should show, in order."),
});

export const setContactsToolOutputSchema = z.object({
  resumeId: z.string(),
  contacts: z.array(contactViewSchema),
});

const linkViewSchema = z.object({ id: z.string(), label: z.string(), url: z.string() });

export const setLinksToolInputSchema = z.object({
  ...targetResumeShape,
  links: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        url: linkUrlSchema,
      }),
    )
    .max(12)
    .describe("Every header link, in order. Plain http(s) web addresses only."),
});

export const setLinksToolOutputSchema = z.object({
  resumeId: z.string(),
  links: z.array(linkViewSchema),
});

export const setNotesToolInputSchema = z.object({
  ...targetResumeShape,
  label: z.string().trim().max(80).optional().describe('Heading, "Notes" by default.'),
  text: z.string().trim().max(6_000).describe("Cover-letter or extra notes. Empty clears them."),
});

export const setNotesToolOutputSchema = z.object({
  resumeId: z.string(),
  notes: z.object({ id: z.string(), label: z.string(), text: z.string() }).nullable(),
});

export type SetContactsToolInput = z.input<typeof setContactsToolInputSchema>;
export type SetContactsToolOutput = z.infer<typeof setContactsToolOutputSchema>;
export type SetLinksToolInput = z.input<typeof setLinksToolInputSchema>;
export type SetLinksToolOutput = z.infer<typeof setLinksToolOutputSchema>;
export type SetNotesToolInput = z.input<typeof setNotesToolInputSchema>;
export type SetNotesToolOutput = z.infer<typeof setNotesToolOutputSchema>;
