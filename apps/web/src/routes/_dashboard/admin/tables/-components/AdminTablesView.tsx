import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { adminTablesQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import {
  ADMIN_TABLE_GROUPS,
  adminTableGroup,
  type AdminTableGroupId,
} from "@/modules/admin/admin-table-groups";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPageHeader } from "../../-components/AdminPageHeader";

type GroupFilter = "all" | AdminTableGroupId;

const groupLabel = new Map<string, string>(
  ADMIN_TABLE_GROUPS.map((group) => [group.id, group.label]),
);

function isGroupFilter(value: string): value is GroupFilter {
  return value === "all" || groupLabel.has(value);
}

export function AdminTablesView({ group }: { group: GroupFilter }) {
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(adminTablesQueryOptions);
  const [filter, setFilter] = useState("");

  const tables = data
    .map((table) => ({ ...table, group: adminTableGroup(table.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const countByGroup = new Map<string, number>();
  for (const table of tables) {
    countByGroup.set(table.group, (countByGroup.get(table.group) ?? 0) + 1);
  }

  const needle = filter.trim().toLowerCase();
  const visible = tables.filter(
    (table) =>
      (group === "all" || table.group === group) &&
      (!needle || table.name.toLowerCase().includes(needle)),
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-test="admin-tables">
      <AdminPageHeader
        title="Tables"
        description={`${tables.length} tables in the remote database`}
        backTo="/admin"
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ToggleGroup
          type="single"
          variant="outline"
          value={group}
          onValueChange={(value) => {
            if (!value || !isGroupFilter(value)) return;
            void navigate({ to: "/admin/tables", search: { group: value } });
          }}
          className="flex-wrap"
          data-test="admin-table-groups"
        >
          <ToggleGroupItem value="all" data-test="admin-table-group-all">
            All <span className="ml-1 text-xs opacity-60">{tables.length}</span>
          </ToggleGroupItem>
          {ADMIN_TABLE_GROUPS.map((option) => (
            <ToggleGroupItem
              key={option.id}
              value={option.id}
              data-test={`admin-table-group-${option.id}`}
            >
              {option.label}
              <span className="ml-1 text-xs opacity-60">{countByGroup.get(option.id) ?? 0}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Input
          className="lg:max-w-xs"
          placeholder="Filter by name"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          data-test="admin-table-filter"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-base-content/60">No tables match.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((table) => (
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
              <div className="mt-2 flex items-center gap-2 text-xs text-base-content/60">
                {group === "all" ? (
                  <Badge variant="outline">{groupLabel.get(table.group)}</Badge>
                ) : null}
                <span>{table.columns.length} columns</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
