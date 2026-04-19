import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const ProjectsAndRepositries = lazy(() => import("./-components/ProjectsAndRepositries"));

const projectsSearchSchema = z.object({
  search: z.string().optional().default(""),
  sort: z.enum(["updated", "stars", "name", "created"]).optional().default("updated"),
  forks: z.enum(["all", "source", "fork"]).optional().default("all"),
});

export const Route = createFileRoute("/_dashboard/projects/")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Projects", description: "View and manage your GitHub projects" }],
  }),
  ssr: false,
  validateSearch: (search) => projectsSearchSchema.parse(search),
});

function RouteComponent() {
  return (
    <div className="w-full min-h-screen flex flex-col">
      <ProjectsAndRepositries />
    </div>
  );
}
