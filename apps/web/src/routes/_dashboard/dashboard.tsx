import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardChat } from "./-components/dashboard/DashboardChat";
import { RecentResumes } from "./-components/dashboard/RecentResumes";

export const Route = createFileRoute("/_dashboard/dashboard")({
  component: RouteComponent,
  ssr: false,
  head: () => ({
    meta: [
      {
        title: "Dashboard",
        description: "Your local-first résumé library",
      },
    ],
  }),
});

function RouteComponent() {
  return (
    <div className="flex w-full flex-col gap-8 h-full" data-test="event-sourced-dashboard">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* <ImportAllFromLegacyButton /> */}
        </div>
        {/* TODO figire put  aw ay to create a serach bar that allows us to serch trough every rown ondevice tha will be used by the searchbar here and the agnet tool to quickly grep though the project */}
      </div>

      <div className="h-full w-full flex flex-col items-center justify-center gap-6">
        <div className="h-full w-full flex flex-col items-center justify-center gap-6">
          <h1 className="text-4xl font-bold tracking-tight">{AppConfig.name}</h1>
          <h2 className="text-lg text-muted-foreground">Let's get crafting</h2>
        </div>
        <div className="h-full max-w-[90%] md:max-w-[70%]">
          <RecentResumes />
        </div>
      </div>
      <div className="h-full w-full flex justify-center">
        <DashboardChat />
      </div>
    </div>
  );
}
