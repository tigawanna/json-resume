import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminEventUsersQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

export function EventUsersTab({ onSelect }: { onSelect: (userId: string) => void }) {
  const query = useQuery(adminEventUsersQueryOptions);
  const users = query.data ?? [];

  return (
    <div className="flex flex-col gap-4" data-test="admin-event-users-tab">
      <p className="text-sm text-base-content/70">
        Users with events in the log. Select one to see their events.
      </p>

      {query.error ? <p className="text-sm text-error">{query.error.message}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Events</TableHead>
              <TableHead className="text-right">Waiting</TableHead>
              <TableHead>Last event</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.userId}
                className="cursor-pointer"
                onClick={() => onSelect(user.userId)}
                data-test="admin-event-user-row"
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name ?? "Deleted user"}</span>
                    <span className="text-xs text-base-content/60">
                      {user.email ?? user.userId}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {user.events.toLocaleString()}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${user.unprojected > 0 ? "text-warning" : "text-base-content/50"}`}
                >
                  {user.unprojected.toLocaleString()}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {user.lastEventAt == null ? "—" : new Date(user.lastEventAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <ArrowRight className="ml-auto size-4 text-base-content/50" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
