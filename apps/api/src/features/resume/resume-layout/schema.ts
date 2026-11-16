import { z } from "zod";
import { SECTION_KEYS } from "../resume-schema/constants";

/**
 * What a résumé shows from the library, and in what order. Array position is
 * the order everywhere — there are no sort numbers inside a layout.
 */
export const resumeLayoutSchema = z.object({
  sections: z
    .array(z.object({ key: z.string(), title: z.string(), enabled: z.boolean() }))
    .default([]),
  experiences: z
    .array(z.object({ id: z.string(), bullets: z.array(z.string()).default([]) }))
    .default([]),
  skillGroups: z
    .array(z.object({ id: z.string(), skills: z.array(z.string()).default([]) }))
    .default([]),
  education: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
  talks: z.array(z.string()).default([]),
  contacts: z.array(z.string()).default([]),
  links: z.array(z.string()).default([]),
  summaries: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  volunteers: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
});
export type ResumeLayout = z.infer<typeof resumeLayoutSchema>;
export type ResumeLayoutSection = ResumeLayout["sections"][number];

/** Every layout list that holds library ids (everything but `sections`). */
export type LayoutEntityKey = Exclude<keyof ResumeLayout, "sections">;
type FlatEntityKey = Exclude<LayoutEntityKey, "experiences" | "skillGroups">;

/** Layout lists that hold plain ids (no nested bullet / skill selection). */
export const FLAT_LAYOUT_KEYS = [
  "education",
  "projects",
  "talks",
  "contacts",
  "links",
  "summaries",
  "notes",
  "certifications",
  "volunteers",
  "languages",
] as const satisfies readonly FlatEntityKey[];

/** Every layout list that holds library ids, in a fixed order. */
export const LAYOUT_ENTITY_KEYS = [
  "experiences",
  "skillGroups",
  ...FLAT_LAYOUT_KEYS,
] as const satisfies readonly LayoutEntityKey[];

export function defaultSectionTitle(key: string) {
  return key === "header" ? "Profile" : key.charAt(0).toUpperCase() + key.slice(1);
}

export function emptyResumeLayout(): ResumeLayout {
  return {
    sections: SECTION_KEYS.map((key) => ({ key, title: defaultSectionTitle(key), enabled: true })),
    experiences: [],
    skillGroups: [],
    education: [],
    projects: [],
    talks: [],
    contacts: [],
    links: [],
    summaries: [],
    notes: [],
    certifications: [],
    volunteers: [],
    languages: [],
  };
}
