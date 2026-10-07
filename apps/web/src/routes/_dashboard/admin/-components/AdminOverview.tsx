import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminOverviewQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { RebuildEventLogCard } from "./RebuildEventLogCard";

export function AdminOverview() {
  const { data } = useSuspenseQuery(adminOverviewQueryOptions);
  const [filter, setFilter] = useState("");
  const tables = data.tables.filter((table) =>
    table.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-test="admin-overview">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-base-content/70">
          Live view of the remote database. Tables and columns are read from the database itself.
        </p>
      </header>

      <RebuildEventLogCard users={data.users} />

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Tables</CardTitle>
            <CardDescription>{data.tables.length} tables in the remote database</CardDescription>
          </div>
          <Input
            className="md:max-w-xs"
            placeholder="Filter tables"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            data-test="admin-table-filter"
          />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
              <Link
                key={table.name}
                to="/admin/tables/$table"
                params={{ table: table.name }}
                search={{ page: 0 }}
                className="rounded-lg border border-base-300 bg-base-200 p-3 transition-colors hover:bg-base-300"
                data-test={`admin-table-link-${table.name}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-sm font-medium">{table.name}</span>
                  <Badge variant="secondary">{table.rowCount.toLocaleString()} rows</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-base-content/60">
                  {table.columns.map((column) => column.name).join(", ")}
                </p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
