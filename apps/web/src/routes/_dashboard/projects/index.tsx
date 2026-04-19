import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const ProjectsAndRepositries = lazy(() => import("./-components/ProjectsAndRepositries"));

export const Route = createFileRoute("/_dashboard/projects/")({
  component: RouteComponent,
  head: () => ({
    meta: [{ title: "Projects", description: "View and manage your GitHub projects" }],
  }),
  ssr: false,
});

function RouteComponent() {
  return (
    <div className="w-full min-h-screen flex flex-col justify-center">
      <ProjectsAndRepositries />
    </div>
  );
}
