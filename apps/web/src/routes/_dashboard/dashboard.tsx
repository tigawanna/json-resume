import { RouterPendingComponent } from "@/lib/tanstack/router/RouterPendingComponent";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openDashboardAssistant } from "./-ai/-hooks/use-dashboard-assistant";
import { CreditBalanceCard } from "./-components/credits/CreditBalanceCard";
import { DashboardSearch } from "./-components/dashboard/DashboardSearch";
import { RecentResumes } from "./-components/dashboard/RecentResumes";

export const Route = createFileRoute("/_dashboard/dashboard")({
  component: RouteComponent,
  ssr: false,
  validateSearch: (search) => z.object({ q: z.string().optional() }).parse(search),
  head: () => ({
    meta: [
      {
        title: "Dashboard",
        description: "Your local-first résumé library",
      },
    ],
  }),
  pendingComponent: RouterPendingComponent,
});

function RouteComponent() {
  return (
    <div className="relative flex h-full w-full flex-col gap-8" data-test="event-sourced-dashboard">
      <CreditBalanceCard />
      <div className="flex h-full w-full flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-4xl text-muted-foreground">Let's get crafting</h2>
            <DashboardSearch />
          </div>
        </div>
        <div className="w-full max-w-[90%] md:max-w-[70%]">
          <RecentResumes onStartFromJob={() => openDashboardAssistant({ fresh: true })} />
        </div>
      </div>
    </div>
  );
}
