import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/saved-projects/")({
  beforeLoad: () => {
    throw redirect({ to: "/resume-projects", replace: true });
  },
});
