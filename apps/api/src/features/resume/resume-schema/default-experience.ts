import type { ResumeDocumentV1 } from "./document";

export function createDefaultExperience(): ResumeDocumentV1["experience"] {
  return {
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
  };
}
