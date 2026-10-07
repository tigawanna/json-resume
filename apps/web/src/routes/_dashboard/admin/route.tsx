import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/admin/route")({
  ssr: false,
  beforeLoad: ({ context }) => {
    if (context.viewer?.user?.role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => <Outlet />,
});
