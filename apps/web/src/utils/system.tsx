import { FileJson } from "lucide-react";

export const AppConfig = {
  name: "Agentic JSON Resume",
  wordmark: "AJR",
  brief:
    "Turn your résumé into JSON, tailor it with any LLM using a job description, and export a clean PDF—without pasting prose back into a doc.",
  description:
    "A structured JSON résumé you can copy into ChatGPT or any assistant with a job posting, paste the improved JSON back, and download a PDF. Built with React, TanStack Start, and Vite+.",
  logo: {
    src: "/logo.png",
    alt: "Agentic JSON Resume",
    href: "/",
  },
  icon: FileJson,
  themeStorageKey: "agentic-json-resume.theme",
  links: {
    github: "https://github.com/your-org/agentic-json-resume",
    mail: "mailto:hello@example.com",
  },
};
