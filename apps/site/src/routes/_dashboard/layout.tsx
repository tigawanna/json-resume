import { RouterNotFoundComponent } from "@/lib/tanstack/router/RouterNotFoundComponent";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { RouterErrorComponent } from "@/lib/tanstack/router/routerErrorComponent";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "./-components/dashoboard-sidebar/DashboardLayout";
import { AppConfig } from "@/utils/system";
import {
  dashboard_account_routes,
  dashboard_admin_routes,
  getDashboardPrimaryRoutes,
} from "./-components/dashoboard-sidebar/dashboard_routes";
import { viewerMiddleware } from "@/data-access-layer/auth/viewer";

export const Route = createFileRoute("/_dashboard")({
  pendingComponent: () => <RouterPendingComponent />,
  notFoundComponent: () => <RouterNotFoundComponent />,
  errorComponent: ({ error }) => <RouterErrorComponent error={error} />,
  server: {
    middleware: [viewerMiddleware],
  },
  component: DashboardShell,
  beforeLoad: async ({ context, serverContext }) => {
    if (!serverContext?.isServer && !context.viewer?.user) {
      throw redirect({ to: "/auth", search: { returnTo: location.pathname } });
    }
  },
  head: () => ({
    meta: [
      {
        title: `${AppConfig.name} | Dashboard`,
        description: "Your résumé JSON and PDF exports",
      },
    ],
  }),
});

function DashboardShell() {
  const primaryRoutes = getDashboardPrimaryRoutes();
  return (
    <DashboardLayout
      sidebarRoutes={primaryRoutes}
      sidebarLabel="Menu"
      accountRoutes={dashboard_account_routes}
      accountLabel="Account"
      adminRoutes={dashboard_admin_routes}
      adminLabel="Administration"
    />
  );
}
