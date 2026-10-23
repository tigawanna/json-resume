import { createFileRoute } from "@tanstack/react-router";
import { ProfileView } from "./-components/ProfileView";

export const Route = createFileRoute("/_dashboard/profile/")({
  component: ProfileView,
  head: () => ({
    meta: [{ title: "Account", description: "Your account and this session" }],
  }),
});
