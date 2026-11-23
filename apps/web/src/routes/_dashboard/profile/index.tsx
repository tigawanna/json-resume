import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProfileView } from "./-components/ProfileView";

export const Route = createFileRoute("/_dashboard/profile/")({
  component: ProfileView,
  beforeLoad: ({ context, location }) => {
    if (!context.viewer?.user) {
      throw redirect({ to: "/auth", search: { returnTo: location.pathname } });
    }
  },
  head: () => ({
    meta: [{ title: "Account", description: "Your account and this session" }],
  }),
});
