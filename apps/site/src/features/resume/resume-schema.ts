import { z } from "zod";

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
  "skills",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

const linkPair = z.object({
  label: z.string(),
  url: z.string(),
});

const headerBlock = z.object({
  enabled: z.boolean(),
  fullName: z.string(),
  headline: z.string(),
  email: z.string(),
  location: z.string(),
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
  bullets: z.array(z.string()),
});

const experienceBlock = z.object({
  enabled: z.boolean(),
  items: z.array(experienceItem),
});

const educationItem = z.object({
  school: z.string(),
  degree: z.string(),
  year: z.string(),
});

const educationBlock = z.object({
  enabled: z.boolean(),
  items: z.array(educationItem),
});

const projectItem = z.object({
  name: z.string(),
  url: z.string(),
  homepageUrl: z.string().optional(),
  description: z.string(),
  tech: z.array(z.string()),
});

const projectsBlock = z.object({
  enabled: z.boolean(),
  items: z.array(projectItem),
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
  skills: skillsBlock,
});

export type ResumeDocumentV1 = z.infer<typeof resumeDocumentV1Schema>;

export function parseResumeJson(raw: string): ResumeDocumentV1 {
  const parsed: unknown = JSON.parse(raw);
  return resumeDocumentV1Schema.parse(parsed);
}

function migrateTemplateId(parsed: unknown): unknown {
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "meta" in parsed &&
    typeof (parsed as Record<string, unknown>).meta === "object"
  ) {
    const meta = (parsed as Record<string, Record<string, unknown>>).meta;
    if (meta && !TEMPLATE_IDS.includes(meta.templateId as TemplateId)) {
      return { ...(parsed as Record<string, unknown>), meta: { ...meta, templateId: "classic" } };
    }
  }
  return parsed;
}

export function safeParseResumeJson(
  raw: string,
): { ok: true; data: ResumeDocumentV1 } | { ok: false; error: string } {
  try {
    const parsed = migrateTemplateId(JSON.parse(raw));
    const r = resumeDocumentV1Schema.safeParse(parsed);
    if (r.success) return { ok: true, data: r.data };
    return { ok: false, error: r.error.message };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

export function createDefaultResume(): ResumeDocumentV1 {
  return {
    version: 1,
    meta: { templateId: "classic" },
    sectionOrder: [...SECTION_KEYS],
    header: {
      enabled: true,
      fullName: "Alex Rivera",
      headline: "Senior Software Engineer",
      email: "alex@example.com",
      location: "Remote / UTC-5",
      links: [
        { label: "GitHub", url: "https://github.com" },
        { label: "LinkedIn", url: "https://linkedin.com" },
      ],
    },
    summary: {
      enabled: true,
      text: "Backend-leaning full-stack engineer focused on typed APIs, Postgres, and React. Paste a job description into your LLM with this JSON to tailor bullets and ordering.",
    },
    experience: {
      enabled: true,
      items: [
        {
          company: "Example Corp",
          role: "Staff Engineer",
          start: "2021",
          end: "Present",
          bullets: [
            "Led migration to structured configuration and cut incident response time.",
            "Shipped developer tooling used by 40+ engineers.",
          ],
        },
      ],
    },
    education: {
      enabled: true,
      items: [{ school: "State University", degree: "B.S. Computer Science", year: "2016" }],
    },
    projects: {
      enabled: true,
      items: [
        {
          name: "agentic-json-resume",
          url: "https://github.com",
          description: "JSON-first résumé with LLM-friendly diffs and PDF export.",
          tech: ["TypeScript", "TanStack Start", "React"],
        },
      ],
    },
    skills: {
      enabled: true,
      groups: [
        { name: "Languages", items: ["TypeScript", "Go", "SQL"] },
        { name: "Platform", items: ["PostgreSQL", "Docker", "AWS"] },
      ],
    },
  };
}

export function moveSectionOrder(
  order: SectionKey[],
  key: SectionKey,
  direction: -1 | 1,
): SectionKey[] {
  const idx = order.indexOf(key);
  if (idx < 0) return order;
  const next = idx + direction;
  if (next < 0 || next >= order.length) return order;
  const copy = [...order];
  const tmp = copy[idx];
  const swap = copy[next];
  if (tmp === undefined || swap === undefined) return order;
  copy[idx] = swap;
  copy[next] = tmp;
  return copy;
}
