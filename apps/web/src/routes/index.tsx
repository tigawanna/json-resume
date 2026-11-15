import { createFileRoute } from "@tanstack/react-router";

import { AppConfig } from "@/utils/system";
import { LandingPage } from "./-components/landing/LandingPage";

const siteUrl = AppConfig.url;
const ogImage = `${siteUrl}/og.png`;
const title = "CraVfted: a free résumé builder for developers";
const description =
  "A free résumé builder for developers. Keep your history as structured JSON, tailor it to a posting, and export an ATS-friendly PDF.";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      {
        name: "keywords",
        content:
          "free resume builder for developers, ATS friendly PDF, JSON resume, software engineer resume, tailored resume",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: ogImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content:
          "CraVfted, a personal résumé builder. Turn your résumé into JSON, tailor it with an LLM using a job description, and export a clean PDF.",
      },
      { property: "og:url", content: siteUrl },
      { property: "og:site_name", content: AppConfig.name },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: ogImage },
      { name: "twitter:site", content: "@tigawanna" },
      { name: "theme-color", content: "#267d42" },
      {
        "script:ld+json": {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: title,
          description,
          url: siteUrl,
          image: ogImage,
        },
      },
    ],
    links: [{ rel: "canonical", href: siteUrl }],
  }),
});
