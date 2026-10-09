import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronsUpDown,
  Gift,
  Loader2,
  Search,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { useOpenRouterModels } from "@/hooks/use-openrouter-models";
import { formatModelPrice, formatTokenCount } from "@/services/openrouter/openrouter.api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { OpenRouterModelData } from "@/types/openrouter";
import { LOW_OUTPUT_CAP_TOKENS, modelAuthor, supportsTools } from "./openrouter-routing";

interface ModelPickerProps {
  value: string;
  onChange: (modelId: string) => void;
}

const modelSorts = ["popular", "cheapest", "newest", "context"] as const;
type ModelSort = (typeof modelSorts)[number];

const sortLabels: Record<ModelSort, string> = {
  popular: "Popular",
  cheapest: "Cheapest",
  newest: "Release date",
  context: "Context",
};

const releaseDateFormat = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function isModelSort(value: string): value is ModelSort {
  return modelSorts.some((sort) => sort === value);
}

function isFree(model: OpenRouterModelData): boolean {
  return Number(model.pricing.prompt) === 0 && Number(model.pricing.completion) === 0;
}

function sortModels(
  models: OpenRouterModelData[],
  sort: ModelSort,
  oldestFirst: boolean,
): OpenRouterModelData[] {
  if (sort === "popular") return models;
  return [...models].sort((a, b) => {
    if (sort === "cheapest") return Number(a.pricing.prompt) - Number(b.pricing.prompt);
    if (sort === "newest") {
      const newer = (b.created ?? 0) - (a.created ?? 0);
      return oldestFirst ? -newer : newer;
    }
    return b.context_length - a.context_length;
  });
}

function labOptions(models: OpenRouterModelData[]): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const model of models) {
    const author = modelAuthor(model.id);
    counts.set(author, (counts.get(author) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function ModelPicker({ value, onChange }: ModelPickerProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ModelSort>("popular");
  const [oldestFirst, setOldestFirst] = useState(false);
  const [lab, setLab] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [toolsOnly, setToolsOnly] = useState(true);
  const { data: models, isLoading, isError } = useOpenRouterModels();

  const term = search.trim().toLowerCase();
  const filtered = sortModels(
    (models ?? []).filter(
      (model) =>
        (!term ||
          model.id.toLowerCase().includes(term) ||
          model.name.toLowerCase().includes(term)) &&
        (!lab || modelAuthor(model.id) === lab) &&
        (!freeOnly || isFree(model)) &&
        (!toolsOnly || supportsTools(model)),
    ),
    sort,
    oldestFirst,
  );

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
    <div className="flex flex-col gap-3" data-test="model-picker">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search models..."
          className="h-10 rounded-xl border-0 bg-base-100/70 pl-9 shadow-none ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)] focus-visible:ring-primary/35"
          data-test="model-picker-search"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <LabCombobox
          value={lab}
          options={labOptions(models ?? [])}
          total={models?.length ?? 0}
          onChange={setLab}
        />
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={sort}
          onValueChange={(next) => {
            if (isModelSort(next)) {
              setSort(next);
              setOldestFirst(false);
            } else if (sort === "newest") {
              setOldestFirst((value) => !value);
            }
          }}
          aria-label="Sort models"
        >
          {modelSorts.map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              className="gap-1 text-xs"
              title={option === "newest" ? "Click again to flip the order" : undefined}
              data-test={`model-picker-sort-${option}`}
            >
              {sortLabels[option]}
              {option === "newest" && sort === "newest" ? (
                oldestFirst ? (
                  <ArrowUp className="size-3" aria-label="oldest first" />
                ) : (
                  <ArrowDown className="size-3" aria-label="newest first" />
                )
              ) : null}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Toggle
          variant="outline"
          size="sm"
          pressed={toolsOnly}
          onPressedChange={setToolsOnly}
          className="gap-1 text-xs"
          aria-label="Only models with tool use"
          data-test="model-picker-tools-only"
        >
          <Wrench className="size-3.5" />
          Tools
        </Toggle>
        <Toggle
          variant="outline"
          size="sm"
          pressed={freeOnly}
          onPressedChange={setFreeOnly}
          className="gap-1 text-xs"
          aria-label="Only free models"
        >
          <Gift className="size-3.5" />
          Free
        </Toggle>
      </div>

      <div className="max-h-[42vh] overflow-y-auto rounded-2xl bg-base-100/55 p-1 ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No models match.</p>
        ) : (
          filtered.map((model) => (
            <ModelRow
              key={model.id}
              model={model}
              isSelected={model.id === value}
              onSelect={() => onChange(model.id)}
            />
          ))
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length.toLocaleString()} models
        {toolsOnly ? " with tool use (the résumé agent needs it)" : ""}
      </p>
    </div>
  );
}

function LabCombobox({
  value,
  options,
  total,
  onChange,
}: {
  value: string;
  options: { id: string; count: number }[];
  total: number;
  onChange: (lab: string) => void;
}) {
  const [open, setOpen] = useState(false);

  function select(lab: string) {
    onChange(lab);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label="Filter by lab"
          className="w-44 justify-between gap-2 text-xs font-normal"
          data-test="model-picker-lab"
        >
          <span className="truncate">{value || "All labs"}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search labs..." />
          <CommandList>
            <CommandEmpty>No labs found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="all labs" onSelect={() => select("")}>
                All labs
                <span className="ml-auto text-xs text-muted-foreground">{total}</span>
                <Check className={cn("size-3.5", value ? "opacity-0" : "opacity-100")} />
              </CommandItem>
              {options.map((option) => (
                <CommandItem key={option.id} value={option.id} onSelect={() => select(option.id)}>
                  <span className="truncate">{option.id}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{option.count}</span>
                  <Check
                    className={cn("size-3.5", value === option.id ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ModelRow({
  model,
  isSelected,
  onSelect,
}: {
  model: OpenRouterModelData;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const maxOutput = model.top_provider.max_completion_tokens;
  const cacheRead = model.pricing.input_cache_read;
  const lowOutput = typeof maxOutput === "number" && maxOutput < LOW_OUTPUT_CAP_TOKENS;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[color-mix(in_oklch,var(--color-primary)_8%,transparent)]",
        isSelected && "bg-[color-mix(in_oklch,var(--color-primary)_13%,transparent)]",
      )}
      data-test="model-picker-row"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={cn("truncate font-medium", isSelected ? "text-primary" : "text-foreground")}
        >
          {model.name}
        </span>
        {isSelected ? <Check className="size-4 shrink-0 text-primary" /> : null}
      </span>
      <span className="truncate font-mono text-xs text-muted-foreground">{model.id}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>
          {formatModelPrice(model.pricing.prompt)} in · {formatModelPrice(model.pricing.completion)}{" "}
          out
        </span>
        {cacheRead ? <span>· cached {formatModelPrice(cacheRead)}</span> : null}
        <span>· {formatTokenCount(model.context_length)} ctx</span>
        {model.created ? (
          <span>· Released {releaseDateFormat.format(model.created * 1000)}</span>
        ) : null}
        {typeof maxOutput === "number" ? (
          <span className={cn(lowOutput && "text-warning")}>
            · {formatTokenCount(maxOutput)} out
          </span>
        ) : null}
        {!supportsTools(model) ? (
          <Badge variant="outline" className="text-destructive">
            No tool use
          </Badge>
        ) : null}
        {lowOutput ? (
          <Badge variant="outline" className="text-warning">
            Low output cap
          </Badge>
        ) : null}
      </span>
    </button>
  );
}
