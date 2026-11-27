import type { ResumeDocumentV1 } from "./document.ts";

export function createDefaultEducation(): ResumeDocumentV1["education"] {
  return {
    enabled: true,
    items: [
      {
        school: "University of Technology",
        degree: "Bachelor of Science",
        field: "Computer Science",
        year: "2022",
      },
    ],
  };
}

export function createDefaultProjects(): ResumeDocumentV1["projects"] {
  return {
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
  };
}

export function createDefaultTalks(): ResumeDocumentV1["talks"] {
  return {
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
  };
}

export function createDefaultSkills(): ResumeDocumentV1["skills"] {
  return {
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
  };
}
