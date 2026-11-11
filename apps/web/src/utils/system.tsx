import { WhiskersIcon } from "@/components/icon/WhiskersIcon";

export const AppConfig = {
  name: "Whiskers",
  wordmark: "Whiskers",
  brief:
    "Turn your résumé into JSON, tailor it with any LLM using a job description, and export a clean PDF—without pasting prose back into a doc.",
  description:
    "A structured JSON résumé you can copy into ChatGPT or any assistant with a job posting, paste the improved JSON back, and download a PDF. Built with React, TanStack Start, and Vite+.",
  logo: {
    src: "/logo.png",
    alt: "Whiskers",
    href: "/",
  },
  icon: WhiskersIcon,
  themeStorageKey: "whiskers.theme",
  links: {
    github: "https://github.com/your-org/whiskers",
    mail: "mailto:hello@example.com",
  },
};
