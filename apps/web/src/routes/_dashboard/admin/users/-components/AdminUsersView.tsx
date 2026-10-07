import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminUsersQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageHeader } from "../../-components/AdminPageHeader";

export function AdminUsersView() {
  const { data: users } = useSuspenseQuery(adminUsersQueryOptions);
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase();
  const visible = users.filter(
    (user) =>
      !needle ||
      user.name.toLowerCase().includes(needle) ||
      user.email.toLowerCase().includes(needle),
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-test="admin-users">
      <AdminPageHeader
        title="Users"
        description={`${users.length} accounts`}
        backTo="/admin"
        actions={
          <Input
            className="md:max-w-xs"
            placeholder="Search name or email"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            data-test="admin-users-filter"
          />
        }
      />

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Résumés</TableHead>
              <TableHead className="text-right">Events</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((user) => (
              <TableRow key={user.id} data-test="admin-user-row">
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-sm">
                  {user.email}
                  {user.emailVerified ? null : (
                    <span className="ml-2 text-xs text-base-content/50">unverified</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role ?? "user"}
                    </Badge>
                    {user.banned ? <Badge variant="destructive">banned</Badge> : null}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{user.resumes}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {user.events.toLocaleString()}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
