import { useState } from "react";
import { ArrowDownUp, Check, Gift, Loader2, Search, TriangleAlert } from "lucide-react";
import { useOpenRouterModels } from "@/hooks/use-openrouter-models";
import { formatModelPrice } from "@/services/openrouter/openrouter.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OpenRouterModelData } from "@/types/openrouter";

interface ModelPickerProps {
  value: string;
  onChange: (modelId: string) => void;
}

function promptPrice(model: OpenRouterModelData): number {
  return Number(model.pricing.prompt);
}

export function ModelPicker({ value, onChange }: ModelPickerProps) {
  const [search, setSearch] = useState("");
  const [sortCheapest, setSortCheapest] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const { data: models, isLoading, isError } = useOpenRouterModels();

  const term = search.toLowerCase();
  let filtered = term
    ? (models ?? []).filter(
        (model) => model.id.toLowerCase().includes(term) || model.name.toLowerCase().includes(term),
      )
    : (models ?? []);

  if (freeOnly) {
    filtered = filtered.filter(
      (model) => Number(model.pricing.prompt) === 0 && Number(model.pricing.completion) === 0,
    );
  }

  if (sortCheapest) {
    filtered = [...filtered].sort((a, b) => promptPrice(a) - promptPrice(b));
  }

  if (isLoading) {
    return (
      <div className="flex h-28 items-center justify-center gap-2 rounded-xl bg-base-100/60 text-sm text-muted-foreground ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
        <Loader2 className="size-4 animate-spin" />
        Loading models…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-28 items-center justify-center gap-2 rounded-xl bg-destructive/10 text-sm text-destructive ring-1 ring-destructive/20">
        <TriangleAlert className="size-4" />
        Failed to load models
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            className="h-11 rounded-xl border-0 bg-base-100/70 pl-9 shadow-none ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)] focus-visible:ring-primary/35"
          />
        </div>
        <Button
          type="button"
          variant={freeOnly ? "default" : "outline"}
          onClick={() => setFreeOnly((v) => !v)}
          className="h-11 shrink-0 gap-1.5 rounded-xl"
        >
          <Gift className="size-3.5" />
          Free
        </Button>
        <Button
          type="button"
          variant={sortCheapest ? "default" : "outline"}
          onClick={() => setSortCheapest((v) => !v)}
          className="h-11 shrink-0 gap-1.5 rounded-xl"
        >
          <ArrowDownUp className="size-3.5" />
          Cheapest
        </Button>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-2xl bg-base-100/55 p-1 ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No models match.</p>
        ) : (
          filtered.map((model) => {
            const isSelected = model.id === value;
            const inputPrice = formatModelPrice(model.pricing.prompt);
            const outputPrice = formatModelPrice(model.pricing.completion);
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onChange(model.id)}
                className={cn(
                  "grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-[color-mix(in_oklch,var(--color-primary)_8%,transparent)]",
                  isSelected && "bg-[color-mix(in_oklch,var(--color-primary)_13%,transparent)]",
                )}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "truncate font-medium",
                        isSelected ? "text-primary" : "text-foreground",
                      )}
                    >
                      {model.name}
                    </span>
                    {isSelected ? <Check className="size-4 shrink-0 text-primary" /> : null}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                    {model.id}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-[color-mix(in_oklch,var(--color-base-content)_7%,transparent)] px-2.5 py-1 text-xs text-muted-foreground">
                  {inputPrice} in · {outputPrice} out
                </span>
              </button>
            );
          })
        )}
      </div>

      {value && (
        <p className="rounded-xl bg-[color-mix(in_oklch,var(--color-primary)_8%,transparent)] px-3 py-2 text-xs text-muted-foreground">
          Selected: <span className="font-mono">{value}</span>
        </p>
      )}
    </div>
  );
}
