import { RouterNotFoundComponent } from "@/lib/tanstack/router/RouterNotFoundComponent";
import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { SentryRouterErrorComponent } from "@/lib/sentry/error-boundary";
import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashoboard-sidebar/DashboardLayout";
import { EventSourcedDbProvider } from "@/data-access-layer/event-sourced/provider";
import { useViewer } from "@/data-access-layer/auth/viewer";
import {
  claimWaitlistMutationOptions,
} from "@/data-access-layer/waitlist/waitlist-query-options";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { FpsCounter } from "@/components/fps-counter/FpsCounter";
import { DashboardAssistant } from "./-ai/-components/dashboard-assistant/DashboardAssistant";
import {
  dashboard_account_routes,
  dashboard_admin_routes,
  getDashboardPrimaryRoutes,
} from "./-components/dashboard_routes";

export const Route = createFileRoute("/_dashboard")({
  ssr: false,
  pendingComponent: () => <RouterPendingComponent />,
  notFoundComponent: () => <RouterNotFoundComponent />,
  errorComponent: SentryRouterErrorComponent,
  component: DashboardShell,
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
  const { viewer } = useViewer();

  // Idempotent waitlist claim on dashboard load: links the signed-in account to
  // a waitlist entry with the same email. Best-effort; failures stay silent.
  const claimWaitlist = useMutation({
    ...claimWaitlistMutationOptions,
    onError() {
      // Non-fatal by design.
    },
  });

  useEffect(() => {
    if (viewer.user?.id) {
      claimWaitlist.mutate();
    }
  }, [claimWaitlist, viewer.user?.id]);

  return (
    <EventSourcedDbProvider fallback={<RouterPendingComponent height="h-dvh" />}>
      <DashboardLayout
        sidebarRoutes={primaryRoutes}
        sidebarLabel="Menu"
        accountRoutes={dashboard_account_routes}
        accountLabel="Account"
        adminRoutes={viewer.user?.role === "admin" ? dashboard_admin_routes : []}
        adminLabel="Administration"
      />
      <DashboardAssistant />
      <FpsCounter label="dashboard" />
    </EventSourcedDbProvider>
  );
}
