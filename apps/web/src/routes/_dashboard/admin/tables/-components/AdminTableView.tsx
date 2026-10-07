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
import { adminTablePageQueryOptions } from "@/data-access-layer/admin/admin-query-options";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { AdminPageHeader } from "../../-components/AdminPageHeader";
import { AdminRowSheet } from "./AdminRowSheet";

const PAGE_SIZE = 50;

type AdminTableViewProps = {
  table: string;
  page: number;
  q?: string;
};

export function AdminTableView({ table, page, q }: AdminTableViewProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState(q ?? "");
  const [selectedRowid, setSelectedRowid] = useState<number | null>(null);
  const query = useQuery({
    ...adminTablePageQueryOptions({ table, page, pageSize: PAGE_SIZE, q }),
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  function goTo(nextPage: number, nextQ = q) {
    void navigate({
      to: "/admin/tables/$table",
      params: { table },
      search: { page: nextPage, q: nextQ || undefined },
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 md:p-6" data-test="admin-table-view">
      <AdminPageHeader
        backTo="/admin/tables"
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono">{table}</span>
            {data ? <Badge variant="secondary">{data.total.toLocaleString()} rows</Badge> : null}
          </span>
        }
        actions={
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              goTo(0, search.trim());
            }}
          >
            <Input
              placeholder="Search any column"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              data-test="admin-table-search"
            />
            <button type="submit" className="btn btn-primary btn-sm h-9">
              Search
            </button>
          </form>
        }
      />

      {query.error ? (
        <p className="text-sm text-error" data-test="admin-table-error">
          {query.error.message}
        </p>
      ) : null}

      {data ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-base-300">
            <Table>
              <TableHeader>
                <TableRow>
                  {data.columns.map((column) => (
                    <TableHead key={column.name} className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono">
                        {column.primaryKey ? <KeyRound className="size-3" /> : null}
                        {column.name}
                      </span>
                      <span className="ml-1 text-[10px] text-base-content/50">
                        {column.type || "ANY"}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={data.columns.length} className="text-center">
                      No rows
                    </TableCell>
                  </TableRow>
                ) : (
                  data.rows.map((row) => (
                    <TableRow
                      key={row.rowid}
                      className="cursor-pointer"
                      onClick={() => setSelectedRowid(row.rowid)}
                      data-test="admin-table-row"
                    >
                      {data.columns.map((column) => {
                        const value = row.cells[column.name];
                        return (
                          <TableCell
                            key={column.name}
                            className="max-w-xs truncate font-mono text-xs"
                            title={value == null ? "NULL" : String(value)}
                          >
                            {value == null ? (
                              <span className="text-base-content/40">NULL</span>
                            ) : (
                              String(value)
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end gap-2 text-sm">
            <button
              className="btn btn-ghost btn-sm"
              disabled={page === 0}
              onClick={() => goTo(page - 1)}
              data-test="admin-table-prev"
            >
              Previous
            </button>
            <span>
              Page {page + 1} of {pageCount}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page + 1 >= pageCount}
              onClick={() => goTo(page + 1)}
              data-test="admin-table-next"
            >
              Next
            </button>
          </div>
        </>
      ) : null}

      <AdminRowSheet table={table} rowid={selectedRowid} onClose={() => setSelectedRowid(null)} />
    </div>
  );
}
