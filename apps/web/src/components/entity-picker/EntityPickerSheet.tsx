import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { useDebouncedValue } from "@/hooks/use-debouncer";
import { cn } from "@/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Link2,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";

type AppQueryKeyPrefix = (typeof queryKeyPrefixes)[keyof typeof queryKeyPrefixes];

export interface EntityPickerItem {
  id: string;
  primary: string;
  secondary?: string;
  /** Longer preview text, clamped to two lines in the list. */
  detail?: string;
  badge?: string;
}

interface EntityPickerSheetProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  searchPlaceholder?: string;
  getSearchQueryKey: (query: string) => [AppQueryKeyPrefix, ...unknown[]];
  getSearchQueryFn: (query: string) => () => Promise<T[]>;
  getItem: (row: T) => EntityPickerItem;
  /** Rows already linked: listed, marked, not pickable. */
  attachedIds?: ReadonlyArray<string>;
  multi?: boolean;
  pageSize?: number;
  confirmLabel?: string;
  onPick: (rows: T[]) => void;
}

/**
 * Side drawer for linking existing rows by id: debounced search first,
 * paged results and keyboard navigation.
 */
export function EntityPickerSheet<T>(props: EntityPickerSheetProps<T>) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        data-test="pick-from-existing-dialog"
      >
        <SheetHeader className="border-b pr-10">
          <SheetTitle>{props.title}</SheetTitle>
          {props.description ? <SheetDescription>{props.description}</SheetDescription> : null}
        </SheetHeader>
        <EntityPickerBody {...props} />
      </SheetContent>
    </Sheet>
  );
}

type Entry<T> = { row: T; item: EntityPickerItem };

function EntityPickerBody<T>({
  onOpenChange,
  searchPlaceholder = "Search…",
  getSearchQueryKey,
  getSearchQueryFn,
  getItem,
  attachedIds = [],
  multi = false,
  pageSize = 10,
  confirmLabel = "Add",
  onPick,
}: EntityPickerSheetProps<T>) {
  const [search, setSearch] = useState("");
  const { debouncedValue: query, isDebouncing } = useDebouncedValue(search.trim(), 250);
  const [paging, setPaging] = useState({ query: "", page: 0 });
  const [selected, setSelected] = useState<Map<string, Entry<T>>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(null);

  const result = useQuery({
    queryKey: getSearchQueryKey(query),
    queryFn: getSearchQueryFn(query),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  const attached = new Set(attachedIds);
  const rows = result.data ?? [];
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(paging.query === query ? paging.page : 0, pageCount - 1);
  const entries: Entry<T>[] = rows
    .slice(page * pageSize, (page + 1) * pageSize)
    .map((row) => ({ row, item: getItem(row) }));
  const active = entries.find((entry) => entry.item.id === activeId) ?? entries[0];
  const rangeStart = rows.length === 0 ? 0 : page * pageSize + 1;
  const rangeEnd = Math.min(rows.length, (page + 1) * pageSize);

  function goToPage(next: number) {
    setPaging({ query, page: next });
    setActiveId(null);
  }

  function choose(entry: Entry<T>) {
    if (attached.has(entry.item.id)) return;
    setActiveId(entry.item.id);
    if (!multi) {
      onPick([entry.row]);
      onOpenChange(false);
      return;
    }
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(entry.item.id)) next.delete(entry.item.id);
      else next.set(entry.item.id, entry);
      return next;
    });
  }

  function unselect(id: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  function moveActive(step: number) {
    if (entries.length === 0) return;
    const index = active ? entries.indexOf(active) : -1;
    const nextIndex = Math.min(entries.length - 1, Math.max(0, index + step));
    setActiveId(entries[nextIndex]?.item.id ?? null);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Enter" && active) {
      event.preventDefault();
      choose(active);
    } else if (event.key === "PageDown" && page < pageCount - 1) {
      event.preventDefault();
      goToPage(page + 1);
    } else if (event.key === "PageUp" && page > 0) {
      event.preventDefault();
      goToPage(page - 1);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 border-b p-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            autoFocus
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pr-9 pl-9"
            aria-label="Search"
            data-test="pick-search-input"
          />
          {search ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-base-content absolute top-2.5 right-3"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <p className="text-muted-foreground flex items-center gap-2 text-xs" aria-live="polite">
          {isDebouncing || result.isFetching ? <Loader2 className="size-3 animate-spin" /> : null}
          {query
            ? `${rows.length} match${rows.length === 1 ? "" : "es"} for “${query}”`
            : `${rows.length} item${rows.length === 1 ? "" : "s"}`}
          <span className="ml-auto hidden sm:inline">↑↓ to move · Enter to pick</span>
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {result.isPending ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : result.isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <AlertCircle className="text-destructive size-5" />
            <p className="text-muted-foreground text-center text-sm">Failed to load items.</p>
            <Button variant="outline" size="sm" onClick={() => void result.refetch()}>
              Retry
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            {query ? "No matches. Try fewer or different words." : "Nothing to pick yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1 p-2" data-test="pick-results">
            {entries.map((entry) => (
              <li key={entry.item.id}>
                <PickerRow
                  item={entry.item}
                  query={query}
                  multi={multi}
                  isActive={entry === active}
                  isSelected={selected.has(entry.item.id)}
                  isAttached={attached.has(entry.item.id)}
                  onClick={() => choose(entry)}
                  onFocus={() => setActiveId(entry.item.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t px-4 py-2">
        <span className="text-muted-foreground text-xs">
          {rows.length > 0 ? `${rangeStart}–${rangeEnd} of ${rows.length}` : ""}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => goToPage(page - 1)}
            disabled={page === 0}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-muted-foreground min-w-12 text-center text-xs">
            {page + 1} / {pageCount}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => goToPage(page + 1)}
            disabled={page >= pageCount - 1}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {multi ? (
        <SheetFooter className="border-t">
          {selected.size > 0 ? (
            <div className="flex flex-wrap gap-1" data-test="pick-selected">
              {[...selected.values()].map(({ item }) => (
                <Badge key={item.id} variant="secondary" className="max-w-full gap-1">
                  <span className="truncate">{item.primary}</span>
                  <button
                    type="button"
                    onClick={() => unselect(item.id)}
                    aria-label={`Remove ${item.primary}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selected.size === 0}
              onClick={() => {
                onPick([...selected.values()].map((entry) => entry.row));
                onOpenChange(false);
              }}
            >
              {selected.size > 0 ? `${confirmLabel} (${selected.size})` : confirmLabel}
            </Button>
          </div>
        </SheetFooter>
      ) : null}
    </>
  );
}

interface PickerRowProps {
  item: EntityPickerItem;
  query: string;
  multi: boolean;
  isActive: boolean;
  isSelected: boolean;
  isAttached: boolean;
  onClick: () => void;
  onFocus: () => void;
}

function PickerRow({
  item,
  query,
  multi,
  isActive,
  isSelected,
  isAttached,
  onClick,
  onFocus,
}: PickerRowProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start gap-3 rounded-md border border-transparent px-3 py-2 text-left",
        isActive && "border-border",
        isSelected && "bg-accent",
        isAttached ? "cursor-default opacity-60" : "hover:bg-base-content/5",
      )}
      onClick={onClick}
      onFocus={onFocus}
      aria-pressed={multi ? isSelected : undefined}
      aria-disabled={isAttached}
      data-test={`pick-item-${item.id}`}
    >
      {multi ? (
        <span
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground",
          )}
        >
          {isSelected ? <Check className="size-3" /> : null}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="line-clamp-2 min-w-0 text-sm font-medium leading-tight break-words">
            <Highlight text={item.primary} query={query} />
          </span>
          {item.badge ? (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {item.badge}
            </Badge>
          ) : null}
          {isAttached ? (
            <Badge variant="secondary" className="ml-auto shrink-0 gap-1 text-[10px]">
              <Link2 className="size-3" /> Attached
            </Badge>
          ) : null}
        </span>
        {item.secondary ? (
          <span className="text-muted-foreground mt-0.5 block truncate text-xs">
            <Highlight text={item.secondary} query={query} />
          </span>
        ) : null}
        {item.detail ? (
          <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs">
            <Highlight text={item.detail} query={query} />
          </span>
        ) : null}
      </span>
    </button>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.toLowerCase();
  if (!needle) return text;
  const parts: ReactNode[] = [];
  const haystack = text.toLowerCase();
  let from = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    if (index > from) parts.push(text.slice(from, index));
    parts.push(
      <mark key={index} className="bg-primary/25 rounded-sm text-inherit">
        {text.slice(index, index + needle.length)}
      </mark>,
    );
    from = index + needle.length;
    index = haystack.indexOf(needle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}
