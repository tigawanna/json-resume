import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3 } from "lucide-react";
import type { ReactNode } from "react";

function columnAriaSort(
  sortable: boolean,
  isActive: boolean,
  direction: "asc" | "desc",
): "ascending" | "descending" | "none" | undefined {
  if (!sortable) return undefined;
  if (!isActive) return "none";
  if (direction === "asc") return "ascending";
  return "descending";
}

function columnSortIcon(isActive: boolean, direction: "asc" | "desc") {
  if (!isActive) return <ChevronsUpDown className="text-muted-foreground size-3.5" />;
  if (direction === "asc") return <ArrowUp className="size-3.5" />;
  return <ArrowDown className="size-3.5" />;
}

export type ResponsiveColumn<T> = {
  id: string;
  header: string;
  /** Desktop table cell */
  cell: (row: T) => ReactNode;
  /** Optional mobile label; defaults to header */
  mobileLabel?: string;
  /** Hide this column on the mobile stack (still shown in table) */
  hideOnMobile?: boolean;
  className?: string;
  headClassName?: string;
  /**
   * Collection field used in `orderBy`. Defaults to `id`.
   * Set `sortable: false` for computed columns.
   */
  sortKey?: string;
  sortable?: boolean;
};

type ResponsiveEntityTableProps<T extends { id: string }> = {
  rows: T[];
  columns: ResponsiveColumn<T>[];
  /** Primary line on mobile (defaults to first non-hidden column) */
  mobileTitle?: (row: T) => ReactNode;
  /** Secondary line under the title on mobile */
  mobileSubtitle?: (row: T) => ReactNode;
  actions?: (row: T) => ReactNode;
  dataTest?: string;
  empty?: ReactNode;
  /** Collection field used when the URL has no `sortBy`. */
  defaultSortBy?: string;
  defaultSortDirection?: "asc" | "desc";
  tableClassName?: string;
};

function parseHiddenIds(hidden: unknown) {
  if (typeof hidden !== "string" || hidden.length === 0) return new Set<string>();
  return new Set(hidden.split(",").filter(Boolean));
}

function columnSortKey<T>(col: ResponsiveColumn<T>) {
  return col.sortKey ?? col.id;
}

/**
 * Desktop: real table. Mobile: stacked rows with labeled fields.
 * Column visibility and header sort write URL search (`hidden`, `sortBy`, `sortDirection`).
 * Callers must apply `orderBy` in `useLiveQuery` — this table never sorts rows in JS.
 */
export function ResponsiveEntityTable<T extends { id: string }>({
  rows,
  columns,
  mobileTitle,
  mobileSubtitle,
  actions,
  dataTest,
  empty,
  defaultSortBy = "updatedAt",
  defaultSortDirection = "desc",
  tableClassName,
}: ResponsiveEntityTableProps<T>) {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();

  const hiddenIds = parseHiddenIds(search.hidden);
  const visibleColumns = columns.filter((col) => !hiddenIds.has(col.id));
  const displayColumns = visibleColumns.length > 0 ? visibleColumns : columns.slice(0, 1);

  const activeSortBy = search.sortBy && search.sortBy.length > 0 ? search.sortBy : defaultSortBy;

  const activeSortDirection =
    search.sortDirection === "asc" || search.sortDirection === "desc"
      ? search.sortDirection
      : defaultSortDirection;

  function patchSearch(patch: Record<string, unknown>) {
    void navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        ...patch,
      }),
      replace: true,
    });
  }

  function toggleHidden(columnId: string, nextHidden: boolean) {
    const next = new Set(hiddenIds);
    if (nextHidden) {
      if (displayColumns.length <= 1 && displayColumns[0]?.id === columnId) return;
      next.add(columnId);
    } else {
      next.delete(columnId);
    }
    const serialized = [...next].join(",");
    patchSearch({ hidden: serialized.length > 0 ? serialized : undefined });
  }

  function toggleSort(col: ResponsiveColumn<T>) {
    if (col.sortable === false) return;
    const key = columnSortKey(col);
    const nextDirection = activeSortBy === key && activeSortDirection === "desc" ? "asc" : "desc";
    patchSearch({
      sortBy: key,
      sortDirection: nextDirection,
      page: undefined,
    });
  }

  if (rows.length === 0) {
    return <>{empty ?? null}</>;
  }

  const mobileColumns = displayColumns.filter((c) => !c.hideOnMobile);

  return (
    <div data-test={dataTest} className="flex flex-col gap-2">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              aria-label="Show or hide columns"
              data-test="column-visibility-btn"
            >
              <Columns3 className="size-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((col) => {
              const checked = !hiddenIds.has(col.id);
              const lastVisible = checked && displayColumns.length <= 1;
              return (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={checked}
                  disabled={lastVisible}
                  onCheckedChange={(value) => toggleHidden(col.id, value === false)}
                >
                  {col.header}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="border-border hidden overflow-hidden rounded-lg border md:block">
        <Table className={tableClassName}>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {displayColumns.map((col) => {
                const sortable = col.sortable !== false;
                const key = columnSortKey(col);
                const isActive = sortable && activeSortBy === key;
                const ariaSort = columnAriaSort(sortable, isActive, activeSortDirection);
                const sortIcon = columnSortIcon(isActive, activeSortDirection);

                return (
                  <TableHead key={col.id} className={col.headClassName} aria-sort={ariaSort}>
                    {sortable ? (
                      <button
                        type="button"
                        className="hover:text-foreground inline-flex items-center gap-1 font-medium"
                        onClick={() => toggleSort(col)}
                        data-test={`sort-${key}`}
                      >
                        {col.header}
                        {sortIcon}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                );
              })}
              {actions ? <TableHead className="w-[1%] text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                data-test={`row-${row.id}`}
                className="hover:bg-primary/30 cursor-pointer"
              >
                {displayColumns.map((col) => (
                  <TableCell key={col.id} className={cn("max-w-md overflow-hidden", col.className)}>
                    {col.cell(row)}
                  </TableCell>
                ))}
                {actions ? (
                  <TableCell className="text-right whitespace-nowrap">{actions(row)}</TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden" data-test={`${dataTest ?? "list"}-mobile`}>
        {rows.map((row) => {
          const title = mobileTitle?.(row) ?? mobileColumns[0]?.cell(row) ?? null;
          const subtitle = mobileSubtitle?.(row);

          return (
            <li
              key={row.id}
              className="border-border bg-base-100 rounded-lg border p-4"
              data-test={`mobile-row-${row.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{title}</div>
                  {subtitle ? (
                    <div className="text-muted-foreground mt-0.5 truncate text-xs">{subtitle}</div>
                  ) : null}
                </div>
                {actions ? (
                  <div className="flex shrink-0 items-center gap-0.5">{actions(row)}</div>
                ) : null}
              </div>
              <dl className="mt-3 space-y-1.5">
                {(mobileTitle ? mobileColumns.slice(1) : mobileColumns).map((col) => (
                  <div key={col.id} className="flex gap-3 text-xs">
                    <dt className="text-muted-foreground w-24 shrink-0">
                      {col.mobileLabel ?? col.header}
                    </dt>
                    <dd className="min-w-0 flex-1 truncate font-medium">{col.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
