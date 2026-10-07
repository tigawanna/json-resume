import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { AdminActionCard } from "../../-components/AdminActionCard";
import { SquashEventLogForm } from "../../-components/SquashEventLogForm";
import { CompactLibraryAction } from "./CompactLibraryAction";
import { EventLogResetAction } from "./EventLogResetAction";
import { ProjectionAction } from "./ProjectionAction";
import { PruneLibraryAction } from "./PruneLibraryAction";
import { RebuildEventLogAction } from "./RebuildEventLogAction";

export function DataActionsSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="btn btn-primary btn-sm" data-test="admin-data-actions-open">
          <Wrench className="size-4" />
          Actions
        </button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg" data-test="admin-data-actions">
        <SheetHeader>
          <SheetTitle>Data actions</SheetTitle>
          <SheetDescription>
            Maintenance and repair tools for the server event log.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-6">
          <ActionGroup title="Routine cleanup">
            <ProjectionAction />
            <AdminActionCard
              title="Squash the event log"
              description="Keeps each row's latest event (the full row, or the delete that removed it) and drops the older events it replaced. Runs nightly with a 24 hour window."
              data-test="admin-squash-action"
            >
              <SquashEventLogForm />
            </AdminActionCard>
            <CompactLibraryAction />
          </ActionGroup>
          <ActionGroup title="Destructive">
            <PruneLibraryAction />
            <RebuildEventLogAction />
            <EventLogResetAction />
          </ActionGroup>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ActionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-medium tracking-wide text-base-content/60 uppercase">{title}</h2>
      {children}
    </div>
  );
}
