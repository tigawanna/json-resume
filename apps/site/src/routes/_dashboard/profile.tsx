import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_dashboard/profile"!</div>;
}
