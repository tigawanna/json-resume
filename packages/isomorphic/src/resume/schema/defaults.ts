import { SECTION_KEYS } from "./constants.ts";
import {
  createDefaultEducation,
  createDefaultProjects,
  createDefaultSkills,
  createDefaultTalks,
} from "./default-content.ts";
import { createDefaultExperience } from "./default-experience.ts";
import type { ResumeDocumentV1 } from "./document.ts";

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
    experience: createDefaultExperience(),
    education: createDefaultEducation(),
    projects: createDefaultProjects(),
    talks: createDefaultTalks(),
    skills: createDefaultSkills(),
    notes: { enabled: false, label: "Notes", text: "" },
  };
}
