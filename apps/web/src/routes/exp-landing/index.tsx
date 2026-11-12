import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/exp-landing/")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
