import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { DashboardChat } from "./-components/dashboard/DashboardChat";
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
});

function RouteComponent() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="relative flex h-full w-full flex-col gap-8" data-test="event-sourced-dashboard">
      <div className="flex h-full w-full flex-col items-center justify-center gap-8">
        <div className="flex items-center justify-center gap-3">
          <h2 className="text-4xl text-muted-foreground">Let's get crafting</h2>
          <DashboardSearch />
        </div>
        <div className="w-full max-w-[90%] md:max-w-[70%]">
          <RecentResumes onStartFromJob={() => setChatOpen(true)} />
        </div>
      </div>
      <div className="w-full flex justify-center pb-10">
        <DashboardChat open={chatOpen} onOpenChange={setChatOpen} />
      </div>
    </div>
  );
}
