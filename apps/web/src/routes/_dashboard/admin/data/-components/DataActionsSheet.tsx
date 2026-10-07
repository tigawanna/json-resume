import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { adminUsersQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { useQuery } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { RebuildEventLogAction } from "./RebuildEventLogAction";

export function DataActionsSheet() {
  const users = useQuery(adminUsersQueryOptions);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="btn btn-primary btn-sm" data-test="admin-data-actions-open">
          <Wrench className="size-4" />
          Actions
        </button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md" data-test="admin-data-actions">
        <SheetHeader>
          <SheetTitle>Data actions</SheetTitle>
          <SheetDescription>
            Repair and maintenance tools for the server event log.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          {users.data ? (
            <RebuildEventLogAction users={users.data} />
          ) : (
            <p className="text-sm text-base-content/60">
              {users.error ? users.error.message : "Loading users…"}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
