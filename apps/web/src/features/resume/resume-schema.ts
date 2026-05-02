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
  "talks",
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
});

export type ResumeDocumentV1 = z.infer<typeof resumeDocumentV1Schema>;

export function parseResumeJson(raw: string): ResumeDocumentV1 {
  const parsed: unknown = JSON.parse(raw);
  return resumeDocumentV1Schema.parse(migrateResumeDocumentV1(parsed));
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

const defaultTalksBlock = (): z.infer<typeof talksBlock> => ({
  enabled: false,
  items: [],
});

export function migrateResumeDocumentV1(parsed: unknown): unknown {
  const withTemplate = migrateTemplateId(parsed);
  if (typeof withTemplate !== "object" || withTemplate === null) {
    return withTemplate;
  }
  const o = withTemplate as Record<string, unknown>;
  const out: Record<string, unknown> = { ...o };
  if (!("talks" in out) || typeof out.talks !== "object" || out.talks === null) {
    out.talks = defaultTalksBlock();
  }
  if (Array.isArray(out.sectionOrder)) {
    const order = out.sectionOrder as unknown[];
    const keys = SECTION_KEYS as readonly string[];
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const k of order) {
      if (typeof k === "string" && keys.includes(k) && !seen.has(k)) {
        seen.add(k);
        normalized.push(k);
      }
    }
    for (const k of keys) {
      if (!seen.has(k)) {
        normalized.push(k);
      }
    }
    out.sectionOrder = normalized;
  }
  return out;
}

export function safeParseResumeJson(
  raw: string,
): { ok: true; data: ResumeDocumentV1 } | { ok: false; error: string } {
  try {
    const parsed = migrateResumeDocumentV1(JSON.parse(raw));
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
      fullName: "Jordan Lee",
      headline: "JavaScript Developer / Full-Stack Engineer",
      email: "jordan.lee@example.com",
      location: "Remote",
      links: [
        { label: "GitHub", url: "https://github.com/example" },
        { label: "LinkedIn", url: "https://linkedin.com/in/example" },
      ],
    },
    summary: {
      enabled: true,
      text: "Full-stack JavaScript engineer with 6+ years of experience building production web applications using TypeScript, React, Node.js, and PostgreSQL. Adept at working remotely and asynchronously, writing clean, well-tested code, and collaborating with cross-functional teams to ship impactful features. Passionate about performance, API design, and continuous improvement. Excels at debugging across the stack and conducting thorough code reviews to elevate engineering standards.",
    },
    experience: {
      enabled: true,
      items: [
        {
          company: "CloudScale Systems (US - Remote)",
          role: "Senior Frontend Engineer",
          start: "2026-01",
          end: "Present",
          bullets: [
            "Delivered production-ready Next.js applications with TypeScript, designing state management and data-fetching strategies that scaled across time zones.",
            "Collaborated asynchronously with product and design to scope features, translating complex requirements into intuitive, type-safe UIs.",
            "Owned end-to-end feature development, including cross-browser compatibility testing and robust error handling, ensuring high-quality releases.",
            "Built and maintained Node.js backend integrations for Stripe payments, Google OAuth, and Supabase data operations, ensuring secure and reliable API contracts.",
            "Set up CI/CD pipelines with Railway, Vercel, and GitHub Actions to streamline remote deployments and conducted regular code reviews to maintain high standards.",
          ],
        },
        {
          company: "Nexus Innovations (US - Remote)",
          role: "React Native Developer (Contract)",
          start: "2025-11",
          end: "2026-01",
          location: "Remote US",
          bullets: [
            "Improved app startup time by 30% by optimizing data fetching and eliminating N+1 queries, skills transferable to web performance.",
            "Rebuilt onboarding flows with robust form state management in TypeScript, delivering a seamless user onboarding experience.",
            "Integrated automated testing with Maestro (similar to Playwright) to increase release reliability in a remote, async environment.",
            "Conducted code reviews and contributed to engineering documentation, improving team onboarding and async collaboration.",
          ],
        },
        {
          company: "Digital Forge Solutions",
          role: "Fullstack TypeScript Developer",
          start: "2025-02",
          end: "2025-11",
          location: "Remote",
          bullets: [
            "Architected type-safe React frontends with Apollo GraphQL and TypeScript, consuming backend APIs to deliver CRM dashboards.",
            "Led code reviews and mentored developers on best practices for component design, state management, and testing, improving overall team quality.",
            "Managed CI/CD pipelines with GitHub Actions to ensure reliable, rapid deployment of production web applications.",
            "Implemented Node.js backend features including OAuth resolvers and AI integration for sentiment analysis and lead quality scoring.",
            "Systematically diagnosed and fixed production bugs across the stack, reducing incident response time by 25%.",
          ],
        },
        {
          company: "FlowState (Remote)",
          role: "Frontend Developer (Part-time)",
          start: "2023-07",
          end: "2025-01",
          bullets: [
            "Optimized React application performance using code splitting, lazy loading, and TanStack Query, achieving faster page loads and smoother user experience.",
            "Wrote comprehensive end-to-end tests with Playwright, increasing release confidence and reducing regressions for a fully remote team.",
            "Implemented type-safe authentication and authorization flows with TypeScript, ensuring secure and maintainable frontend code.",
            "Conducted code reviews for peer contributions, enforcing testing standards and TypeScript best practices.",
          ],
        },
        {
          company: "Global Data Systems",
          role: "Software Developer (Full-stack)",
          start: "2018-02",
          end: "2024-12",
          location: "Remote",
          bullets: [
            "Built and maintained full-stack features using React, Node.js, and PostgreSQL, replacing manual Excel workflows with automated dashboards that reduced data entry errors by 90%.",
            "Designed and documented RESTful APIs consumed by React frontends, enforcing type-safe contracts with TypeScript.",
            "Established CI/CD pipelines with GitHub Actions and Docker, enabling stable, frequent deployments.",
            "Diagnosed and fixed data inconsistencies in PostgreSQL, implementing migration scripts and validation logic.",
          ],
        },
      ],
    },
    education: {
      enabled: true,
      items: [
        {
          school: "University of Technology",
          degree: "Bachelor of Science",
          field: "Computer Science",
          year: "2022",
        },
      ],
    },
    projects: {
      enabled: true,
      items: [
        {
          name: "flowboard",
          url: "https://github.com/example/flowboard",
          homepageUrl: "https://example.com/flowboard",
          description:
            "Kanban-style task manager with real-time sync and team collaboration features.",
          tech: [],
        },
        {
          name: "realestate-pulse",
          url: "https://github.com/example/realestate-pulse",
          description:
            "Next.js dashboard for property listings and agent analytics, hosted on Cloudflare.",
          tech: ["Next.js", "TypeScript", "Cloudflare"],
        },
        {
          name: "spatial-notes-demo",
          url: "https://github.com/example/spatial-notes-demo",
          description: "Mobile app demo using on-device spatial database with Expo and SQLite.",
          tech: ["expo", "libspatialite", "op-sqlite", "sqlite"],
        },
        {
          name: "salon-booking-hub",
          url: "https://github.com/example/salon-booking-hub",
          homepageUrl: "https://example-salon.vercel.app",
          description:
            "Booking platform for beauty services with Pocketbase CMS and Framer Motion animations.",
          tech: ["framermotion", "nextjs", "pocketbase", "shadcn", "tailwind"],
        },
      ],
    },
    talks: {
      enabled: true,
      items: [
        {
          title: "Advanced TypeScript patterns for component libraries",
          event: "JS Community Meetup",
          date: "2025",
          links: [{ label: "slides", url: "https://example.com/slides/ts-patterns" }],
        },
        {
          title: "Modern frontend tooling in 2024",
          event: "WebDev Conference",
          date: "2024",
          links: [{ label: "slides", url: "https://example.com/slides/frontend-tooling" }],
        },
      ],
    },
    skills: {
      enabled: true,
      groups: [
        { name: "Languages", items: ["TypeScript", "JavaScript (ES6+)", "SQL", "HTML/CSS"] },
        {
          name: "Frontend",
          items: ["React", "Next.js", "Vite/Webpack/esbuild", "Responsive Design"],
        },
        {
          name: "Backend",
          items: ["Node.js", "Express", "REST APIs", "GraphQL", "PostgreSQL", "Supabase"],
        },
        {
          name: "Testing & DevOps",
          items: ["Jest", "Playwright", "CI/CD (GitHub Actions)", "Docker", "AWS"],
        },
        {
          name: "Tools & Workflows",
          items: ["Git", "Code Review", "Remote Collaboration", "Agile/Scrum"],
        },
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
