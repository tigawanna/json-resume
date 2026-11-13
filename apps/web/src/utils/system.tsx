import { WhiskersIcon } from "@/components/icon/WhiskersIcon";

const contactEmail = "denniskinuthiawaweru@gmail.com";

declare const __SITE_URL__: string;

export const AppConfig = {
  name: "Crafted",
  wordmark: "Crafted",
  url: __SITE_URL__,
  brief:
    "Turn your résumé into JSON, tailor it with any LLM using a job description, and export a clean PDF—without pasting prose back into a doc.",
  description:
    "A free résumé builder for developers. Keep your history as structured JSON, tailor it to a posting, and export an ATS-friendly PDF.",
  logo: {
    src: "/logo.png",
    alt: "Crafted",
    href: "/",
  },
  icon: WhiskersIcon,
  themeStorageKey: "crafted.theme",
  email: contactEmail,
  links: {
    mail: `mailto:${contactEmail}`,
    github: "https://github.com/tigawanna/crafted",
    twitter: "https://twitter.com/tigawanna",
  },
};
