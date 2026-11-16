export const TEMPLATE_IDS = ["classic", "sidebar", "accent", "modern"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  classic: "Classic",
  sidebar: "Sidebar",
  accent: "Accent",
  modern: "Modern",
};

export const SECTION_KEYS = [
  "header",
  "summary",
  "experience",
  "education",
  "projects",
  "talks",
  "skills",
  "notes",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];
