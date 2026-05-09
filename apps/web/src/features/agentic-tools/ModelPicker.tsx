import { useState, useMemo } from "react";
import { ArrowUpDown, Gift, Loader2, TriangleAlert } from "lucide-react";
import { useOpenRouterModels } from "@/hooks/use-openrouter-models";
import { formatModelPrice } from "@/services/openrouter/openrouter.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

  const filtered = useMemo(() => {
    if (!models) return [];
    const term = search.toLowerCase();
    let list = term
      ? models.filter(
          (m) => m.id.toLowerCase().includes(term) || m.name.toLowerCase().includes(term),
        )
      : models;
    if (freeOnly) {
      list = list.filter(
        (m) => Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0,
      );
    }
    if (sortCheapest) {
      return [...list].sort((a, b) => promptPrice(a) - promptPrice(b));
    }
    return list;
  }, [models, search, sortCheapest, freeOnly]);

  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center gap-2 rounded-md border text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading models…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-24 items-center justify-center gap-2 rounded-md border text-sm text-destructive">
        <TriangleAlert className="size-4" />
        Failed to load models
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search models…"
          className="flex-1"
        />
        <Button
          type="button"
          variant={freeOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setFreeOnly((v) => !v)}
          className="shrink-0 gap-1.5"
        >
          <Gift className="size-3.5" />
          Free
        </Button>
        <Button
          type="button"
          variant={sortCheapest ? "default" : "outline"}
          size="sm"
          onClick={() => setSortCheapest((v) => !v)}
          className="shrink-0 gap-1.5"
        >
          <ArrowUpDown className="size-3.5" />
          Cheapest
        </Button>
      </div>

      <div className="max-h-52 overflow-y-auto rounded-md border">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No models match.</p>
        ) : (
          filtered.map((m) => {
            const isSelected = m.id === value;
            const inputPrice = formatModelPrice(m.pricing.prompt);
            const outputPrice = formatModelPrice(m.pricing.completion);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange(m.id)}
                className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${
                  isSelected ? "bg-primary/5 font-medium" : ""
                }`}
              >
                <span className="min-w-0 truncate">{m.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {inputPrice} in · {outputPrice} out
                </span>
              </button>
            );
          })
        )}
      </div>

      {value && (
        <p className="text-xs text-muted-foreground">
          Selected: <span className="font-mono">{value}</span>
        </p>
      )}
    </div>
  );
}
