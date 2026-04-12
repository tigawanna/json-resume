import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type NavigateOptions } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { useCallback, useTransition } from "react";

interface FiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: Record<string, any>;
  navigate: (opts: NavigateOptions<any>) => void;
  searchFields: Array<{ label: string; value: string }>;
  searchOperators: Array<{ label: string; value: string }>;
  filterFields: Array<{ label: string; value: string }>;
  sortByFields: Array<{ label: string; value: string }>;
}

export function FiltersDialog({
  open,
  onOpenChange,
  search,
  navigate,
  searchFields,
  searchOperators,
  filterFields,
  sortByFields,
}: FiltersDialogProps) {
  const [_, startTransition] = useTransition();

  // Internal setSearch function that handles navigation
  const setSearch = useCallback(
    (patch: Partial<Record<string, any>>) => {
      startTransition(() => {
        navigate({
          search: (prev: any) => ({
            ...prev,
            ...patch,
          }),
          replace: true,
          viewTransition: false,
        });
      });
    },
    [navigate],
  );

  const limit = search.limit ?? 10;
  // const searchInput = search.searchValue ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-[90%] min-w-fit overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2 text-sm">
            Refine your user list by applying search, filters, and sorting options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Search</h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Select
                  value={search.searchField ?? ""}
                  onValueChange={(v) => setSearch({ searchField: v || undefined, offset: 0 })}
                >
                  <SelectTrigger className="w-full min-w-40">
                    <SelectValue placeholder="Field" />
                  </SelectTrigger>
                  <SelectContent>
                    {searchFields.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={search.searchOperator ?? ""}
                  onValueChange={(v) => setSearch({ searchOperator: v || undefined, offset: 0 })}
                  disabled={!search.searchField}
                >
                  <SelectTrigger className="w-full min-w-40">
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {searchOperators.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* <Input
                placeholder="Search value…"
                value={searchInput}
                onChange={(e) => setSearch({ searchValue: e.target.value, offset: 0 })}
                disabled={!search.searchField}
              /> */}
            </div>
          </div>

          {/* Page Size */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Page Size</h3>
            <Select
              value={String(limit)}
              onValueChange={(v) => setSearch({ limit: Number(v), offset: 0 })}
            >
              <SelectTrigger className="min-w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Filter by Field</h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Select
                  value={(search.filterField as string | undefined) ?? ""}
                  onValueChange={(v) =>
                    setSearch({
                      filterField: v || undefined,
                      filterOperator: undefined,
                      filterValue: undefined,
                      offset: 0,
                    })
                  }
                >
                  <SelectTrigger className="min-w-40">
                    <SelectValue placeholder="Filter field" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterFields.map((f) => (
                      <SelectItem key={String(f.value)} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={(search.filterOperator as string | undefined) ?? ""}
                  onValueChange={(v) => setSearch({ filterOperator: v || undefined, offset: 0 })}
                  disabled={!search.filterField}
                >
                  <SelectTrigger className="min-w-40">
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["eq", "contains", "ne", "lt", "lte", "gt", "gte"] as const).map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Input
                placeholder="Filter value…"
                value={String(search.filterValue ?? "")}
                onChange={(e) => setSearch({ filterValue: e.target.value, offset: 0 })}
                disabled={!search.filterField}
              />
            </div>
          </div>

          {/* Sort Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Sort by</h3>
            <div className="flex gap-2">
              <Select
                value={(search.sortBy as string | undefined) ?? ""}
                onValueChange={(v) => setSearch({ sortBy: v || undefined, offset: 0 })}
              >
                <SelectTrigger className="min-w-36">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortByFields.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={(search.sortDirection as "asc" | "desc") ?? "desc"}
                onValueChange={(v) =>
                  setSearch({
                    sortDirection: v === "asc" ? "asc" : "desc",
                    offset: 0,
                  })
                }
              >
                <SelectTrigger className="min-w-28">
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Asc</SelectItem>
                  <SelectItem value="desc">Desc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reset & Done */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setSearch({
                  searchValue: undefined,
                  searchField: undefined,
                  searchOperator: undefined,
                  filterField: undefined,
                  filterOperator: undefined,
                  filterValue: undefined,
                  sortBy: "createdAt",
                  sortDirection: "desc",
                  offset: 0,
                });
                onOpenChange(false);
              }}
            >
              Reset
            </Button>

            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
