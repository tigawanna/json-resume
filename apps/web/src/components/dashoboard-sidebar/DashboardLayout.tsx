import { SidebarLinks } from "@/components/sidebar/SidebarLinks";
import { SidebarItem } from "@/components/sidebar/types";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Helmet } from "@/components/wrappers/custom-helmet";
import { AppConfig } from "@/utils/system";
import { TSRBreadCrumbs } from "@/lib/tanstack/router/TSRBreadCrumbs";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { QueryActivityNprogress } from "@/components/navigation/nprogress/QueryActivityNprogress";
import { useViewer } from "@/data-access-layer/auth/viewer";
import { DashboardSidebarFooter } from "./DashboardSidebarFooter";
import { DashboardSidebarHeader } from "./DashboardSidebarHeader";
import { DashboardSyncStatusButton } from "./DashboardSyncStatusButton";
interface DashboardLayoutProps {
  sidebarRoutes: SidebarItem[];
  sidebarLabel: string;
  accountRoutes: SidebarItem[];
  accountLabel: string;
  adminRoutes: SidebarItem[];
  adminLabel: string;
  sidebar_props?: React.ComponentProps<typeof Sidebar>;
}

export function DashboardLayout({
  sidebarRoutes,
  sidebarLabel,
  accountRoutes,
  accountLabel,
  adminRoutes,
  adminLabel,
  sidebar_props,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={false} className="h-svh overflow-hidden">
      <QueryActivityNprogress />
      <Helmet
        title={`${AppConfig.name} | Dashboard`}
        description="Edit your JSON résumé, preview layout, and export PDF."
      />
      <Sidebar collapsible="icon" {...sidebar_props}>
        <SidebarHeader>
          <DashboardSidebarHeader />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="bg-base-300">
            <SidebarGroupLabel className="text-sm font-semibold tracking-wide">
              {sidebarLabel}
            </SidebarGroupLabel>
            <SidebarLinks links={sidebarRoutes} />
          </SidebarGroup>
          {accountRoutes.length > 0 ? (
            <SidebarGroup className="bg-base-300">
              <SidebarGroupLabel className="text-sm font-semibold tracking-wide">
                {accountLabel}
              </SidebarGroupLabel>
              <SidebarLinks links={accountRoutes} />
            </SidebarGroup>
          ) : null}
          {adminRoutes.length > 0 ? (
            <SidebarGroup className="bg-base-300">
              <SidebarGroupLabel className="text-sm font-semibold tracking-wide">
                {adminLabel}
              </SidebarGroupLabel>
              <SidebarLinks links={adminRoutes} />
            </SidebarGroup>
          ) : null}
        </SidebarContent>
        <SidebarFooter className="gap-3 pb-3">
          <DashboardSidebarFooter />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-0">
        <header className="bg-base-100 sticky top-0 z-30 flex h-16 items-center justify-between gap-2 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <TSRBreadCrumbs />
          </div>
          <div className="mr-10">
            <DashboardSyncStatusButton className="shrink-0" />
          </div>
        </header>
        <div className="@container/main flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto p-6">
          <LocalOnlyBanner />
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function LocalOnlyBanner() {
  const { viewer } = useViewer();
  const pathname = useLocation({ select: (location) => location.pathname });

  if (viewer.user) return null;

  const showBanner =
    pathname === "/events" ||
    pathname.startsWith("/events/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/");
  if (!showBanner) return null;

  return (
    <div
      className="bg-muted text-foreground mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
      data-test="local-only-banner"
      role="status"
    >
      <p className="max-w-prose text-pretty">
        You are not signed in. Everything you do stays on this computer until you enable sync.
      </p>
      <Link
        to="/auth"
        search={{ returnTo: pathname }}
        className="btn btn-primary btn-sm shrink-0"
        data-test="local-only-banner-signin"
      >
        Sign in to sync
      </Link>
    </div>
  );
}
