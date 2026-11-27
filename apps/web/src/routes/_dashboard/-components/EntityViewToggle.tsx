import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EntityListView } from "../-utils/list-search";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { LayoutGrid, Table } from "lucide-react";

type EntityViewToggleProps = {
  dataTest?: string;
};

/**
 * Segmented cards ⇄ table switch. State lives in the `view` URL search param
 * (`cards` is the default and stays out of the URL); every list route that
 * declares `view` in its `validateSearch` gets the toggle for free.
 */
export function EntityViewToggle({ dataTest = "entity-view-toggle" }: EntityViewToggleProps) {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const view = search.view === "table" ? "table" : "cards";

  function setView(next: EntityListView) {
    if (next === view) return;
    void navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        view: next === "cards" ? undefined : next,
      }),
      replace: true,
    });
  }

  return (
    <div
      role="group"
      aria-label="List layout"
      data-test={dataTest}
      className="bg-muted/40 flex items-center gap-0.5 rounded-lg border p-0.5"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-7 rounded-md",
          view === "cards"
            ? "bg-card text-foreground shadow-sm hover:bg-card"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={view === "cards"}
        aria-label="Card layout"
        data-test={`${dataTest}-cards`}
        onClick={() => setView("cards")}
      >
        <LayoutGrid className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-7 rounded-md",
          view === "table"
            ? "bg-card text-foreground shadow-sm hover:bg-card"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={view === "table"}
        aria-label="Table layout"
        data-test={`${dataTest}-table`}
        onClick={() => setView("table")}
      >
        <Table className="size-4" />
      </Button>
    </div>
  );
}
