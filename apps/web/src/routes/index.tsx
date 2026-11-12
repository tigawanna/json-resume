import { createFileRoute } from "@tanstack/react-router";

import { ExpLandingPage } from "./exp-landing/-components/exp-landing-page";

export const Route = createFileRoute("/")({
  component: ExpLandingPage,
  head: () => ({
    meta: [
      {
        title: "Crafted: a free résumé builder for developers",
        description:
          "A free résumé builder for developers. Keep your history as structured JSON, tailor it to a posting, and export an ATS-friendly PDF.",
        keywords:
          "free resume builder for developers, ATS friendly PDF, JSON resume, software engineer resume",
      },
    ],
  }),
});
