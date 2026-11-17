import { SECTION_KEYS, type ResumeDocumentV1 } from "./resume-schema";

/** Placeholder document for a first résumé. Labels are prompts, not claimed facts. */
export function createStarterResumeDocument(): ResumeDocumentV1 {
  return {
    version: 1,
    meta: { templateId: "classic" },
    sectionOrder: [...SECTION_KEYS],
    header: {
      enabled: true,
      fullName: "Your name",
      headline: "The role you want next",
      email: "",
      location: "",
      links: [],
    },
    summary: {
      enabled: true,
      text: "A short pitch. Replace this.",
    },
    experience: {
      enabled: true,
      items: [
        {
          company: "Your latest company",
          role: "Your title",
          start: "",
          end: "",
          bullets: [
            "What you shipped or owned. Replace this.",
            "A second line about the work. Replace this.",
          ],
        },
      ],
    },
    education: { enabled: true, items: [] },
    projects: { enabled: true, items: [] },
    talks: { enabled: false, items: [] },
    skills: {
      enabled: true,
      groups: [{ name: "Skills", items: ["Add a skill"] }],
    },
    notes: { enabled: false, label: "Notes", text: "" },
  };
}
