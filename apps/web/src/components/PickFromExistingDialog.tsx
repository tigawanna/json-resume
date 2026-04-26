import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebouncedValue } from "@/hooks/use-debouncer";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Search } from "lucide-react";
import { useState } from "react";

type AppQueryKeyPrefix = (typeof queryKeyPrefixes)[keyof typeof queryKeyPrefixes];

export interface PickFromExistingItem {
  id: string;
  /** Primary display text */
  primary: string;
  /** Secondary/context text */
  secondary?: string;
  /** Tertiary detail */
  detail?: string;
}

interface PickFromExistingDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  getSearchQueryKey: (query: string) => [AppQueryKeyPrefix, ...unknown[]];
  getSearchQueryFn: (query: string) => () => Promise<T[]>;
  /** Map raw data into display items */
  mapToItems: (data: T[]) => PickFromExistingItem[];
  /** Called when user picks one or more items */
  onPick: (items: PickFromExistingItem[]) => void;
  /** Allow picking multiple items */
  multi?: boolean;
}

export function PickFromExistingDialog<T>({
  open,
  onOpenChange,
  title,
  description,
  getSearchQueryKey,
  getSearchQueryFn,
  mapToItems,
  onPick,
  multi = false,
}: PickFromExistingDialogProps<T>) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { debouncedValue: debouncedSearch } = useDebouncedValue(search, 300);

  const query = useQuery<T[]>({
    queryKey: getSearchQueryKey(debouncedSearch),
    queryFn: getSearchQueryFn(debouncedSearch),
    enabled: open,
  });

  const items = query.data ? mapToItems(query.data) : [];

  function toggleItem(item: PickFromExistingItem) {
    if (multi) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
    } else {
      onPick([item]);
      onOpenChange(false);
      setSearch("");
      setSelected(new Set());
    }
  }

  function handleConfirm() {
    const picked = items.filter((item) => selected.has(item.id));
    if (picked.length > 0) {
      onPick(picked);
    }
    onOpenChange(false);
    setSearch("");
    setSelected(new Set());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-test="pick-from-existing-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-test="pick-search-input"
          />
        </div>

        <ScrollArea className="h-80">
          {query.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {search ? "No matches found" : "No existing items"}
            </p>
          ) : (
            <div className="flex flex-col gap-1 p-1" data-test="pick-results">
              {items.map((item) => {
                const isSelected = selected.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`hover:bg-accent flex items-start gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                      isSelected ? "bg-accent" : ""
                    }`}
                    onClick={() => toggleItem(item)}
                    data-test={`pick-item-${item.id}`}
                  >
                    {multi && (
                      <div
                        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground"
                        }`}
                      >
                        {isSelected && <Check className="size-3" />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{item.primary}</p>
                      {item.secondary && (
                        <p className="text-muted-foreground mt-0.5 text-xs">{item.secondary}</p>
                      )}
                      {item.detail && (
                        <p className="text-muted-foreground mt-0.5 text-xs">{item.detail}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {multi && (
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                setSearch("");
                setSelected(new Set());
              }}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={selected.size === 0} onClick={handleConfirm}>
              Add {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
