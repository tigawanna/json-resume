import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { ReposPage } from "./-components/ReposPage";

const searchParams = z.object({
  query: z.string().optional().default(""),
  language: z.string().optional().default(""),
  topic: z.string().optional().default(""),
  minStars: z.string().optional().default(""),
  fork: z.enum(["source", "all", "fork"]).optional().default("source"),
  archived: z.enum(["any", "active", "archived"]).optional().default("active"),
  sort: z
    .enum(["updated", "stars", "forks", "help-wanted-issues", "best-match"])
    .optional()
    .default("updated"),
  order: z.enum(["desc", "asc"]).optional().default("desc"),
});

export const Route = createFileRoute("/_dashboard/repos/")({
  component: ReposPage,
  validateSearch: searchParams,
  ssr: false,
  head: () => ({
    meta: [
      {
        title: "GitHub Repositories",
        description: "Browse and shortlist your GitHub repositories",
      },
    ],
  }),
});
