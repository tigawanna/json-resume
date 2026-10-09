import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Loader2, TriangleAlert } from "lucide-react";
import { openRouterModelEndpointsQueryOptions } from "@/data-access-layer/openrouter/model-endpoints";
import { formatModelPrice, formatTokenCount } from "@/services/openrouter/openrouter.api";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { OpenRouterModelEndpoint } from "@/types/openrouter";
import {
  availableOfficialSlugs,
  isOfficialEndpoint,
  LOW_OUTPUT_CAP_TOKENS,
  providerRoutingModes,
  providerSlugFromTag,
  providerSorts,
  supportsTools,
  type AiRouting,
  type ProviderRoutingMode,
  type ProviderSort,
} from "./openrouter-routing";

interface ProviderRoutingPickerProps {
  modelId: string;
  value: AiRouting;
  onChange: (next: AiRouting) => void;
}

const modeLabels: Record<ProviderRoutingMode, string> = {
  auto: "Auto",
  official: "Official",
  custom: "Custom",
};

const modeDescriptions: Record<ProviderRoutingMode, string> = {
  auto: "OpenRouter picks the provider. Endpoints that drop tool calls or max_tokens are skipped, and tool calls keep Auto Exacto routing.",
  official:
    "Only the model lab's own API, e.g. DeepSeek for DeepSeek models. Slower or pricier at times, but it serves the model as the lab intended.",
  custom: "Pick the providers you trust. They are tried in the order you select them.",
};

const autoSortLabels: Record<ProviderSort | "balanced", string> = {
  balanced: "Balanced",
  price: "Price",
  throughput: "Speed",
  latency: "Latency",
};

const endpointSorts = ["official", "price", "output", "uptime"] as const;
type EndpointSort = (typeof endpointSorts)[number];

const endpointSortLabels: Record<EndpointSort, string> = {
  official: "Official first",
  price: "Price",
  output: "Output cap",
  uptime: "Uptime",
};

function isMode(value: string): value is ProviderRoutingMode {
  return providerRoutingModes.some((mode) => mode === value);
}

function isProviderSort(value: string): value is ProviderSort {
  return providerSorts.some((sort) => sort === value);
}

function isEndpointSort(value: string): value is EndpointSort {
  return endpointSorts.some((sort) => sort === value);
}

function blendedPrice(endpoint: OpenRouterModelEndpoint): number {
  return Number(endpoint.pricing.prompt) * 3 + Number(endpoint.pricing.completion);
}

function sortEndpoints(
  modelId: string,
  endpoints: readonly OpenRouterModelEndpoint[],
  sort: EndpointSort,
): OpenRouterModelEndpoint[] {
  return [...endpoints].sort((a, b) => {
    if (sort === "price") return blendedPrice(a) - blendedPrice(b);
    if (sort === "output") return (b.max_completion_tokens ?? 0) - (a.max_completion_tokens ?? 0);
    if (sort === "uptime") return (b.uptime_last_1d ?? 0) - (a.uptime_last_1d ?? 0);
    return Number(isOfficialEndpoint(modelId, b)) - Number(isOfficialEndpoint(modelId, a));
  });
}

export function ProviderRoutingPicker({ modelId, value, onChange }: ProviderRoutingPickerProps) {
  const [endpointSort, setEndpointSort] = useState<EndpointSort>("official");
  const {
    data: endpoints,
    isLoading,
    isError,
  } = useQuery(openRouterModelEndpointsQueryOptions(modelId));

  const officialSlugs = endpoints ? availableOfficialSlugs(modelId, endpoints) : [];
  const officialUnavailable = !!endpoints && officialSlugs.length === 0;
  const pinnedSlugs = value.mode === "official" ? officialSlugs : value.providers;
  const canPick = value.mode === "custom";

  function setMode(mode: ProviderRoutingMode) {
    onChange({
      ...value,
      mode,
      providers: mode === "custom" ? value.providers : [],
      sort: mode === "auto" ? value.sort : undefined,
    });
  }

  function toggleProvider(slug: string) {
    const providers = value.providers.includes(slug)
      ? value.providers.filter((existing) => existing !== slug)
      : [...value.providers, slug];
    onChange({ ...value, providers });
  }

  return (
    <div className="flex flex-col gap-3" data-test="provider-routing-picker">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={value.mode}
        onValueChange={(next) => {
          if (isMode(next)) setMode(next);
        }}
        aria-label="Provider routing mode"
      >
        {providerRoutingModes.map((mode) => (
          <ToggleGroupItem
            key={mode}
            value={mode}
            disabled={mode === "official" && officialUnavailable}
            className="text-xs"
            data-test={`provider-routing-mode-${mode}`}
          >
            {modeLabels[mode]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">{modeDescriptions[value.mode]}</p>
      {officialUnavailable ? (
        <p className="text-xs text-muted-foreground">
          No first-party endpoint serves <span className="font-mono">{modelId}</span> on OpenRouter.
        </p>
      ) : null}

      {value.mode === "auto" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Prefer</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={value.sort ?? "balanced"}
            onValueChange={(next) => {
              if (!next) return;
              onChange({ ...value, sort: isProviderSort(next) ? next : undefined });
            }}
            aria-label="Auto routing priority"
          >
            {(["balanced", ...providerSorts] as const).map((option) => (
              <ToggleGroupItem key={option} value={option} className="text-xs">
                {autoSortLabels[option]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-base-100/55 px-3 py-2 ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
          <Label htmlFor="provider-routing-fallbacks" className="text-xs font-normal">
            Fall back to other providers when{" "}
            {value.mode === "official" ? "the official API is" : "these are"} down
          </Label>
          <Switch
            id="provider-routing-fallbacks"
            checked={value.allowFallbacks}
            onCheckedChange={(allowFallbacks) => onChange({ ...value, allowFallbacks })}
            data-test="provider-routing-fallbacks"
          />
        </div>
      )}

      {value.mode === "custom" && value.providers.length === 0 ? (
        <p className="text-xs text-warning">
          Select at least one provider below, otherwise auto routing is used.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Providers {endpoints ? `(${endpoints.length})` : ""}
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={endpointSort}
          onValueChange={(next) => {
            if (isEndpointSort(next)) setEndpointSort(next);
          }}
          aria-label="Sort providers"
        >
          {endpointSorts.map((option) => (
            <ToggleGroupItem key={option} value={option} className="text-xs">
              {endpointSortLabels[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="max-h-[36vh] overflow-y-auto rounded-2xl bg-base-100/55 p-1 ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
        {isLoading ? (
          <div className="flex h-20 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading providers…
          </div>
        ) : isError ? (
          <div className="flex h-20 items-center justify-center gap-2 text-sm text-destructive">
            <TriangleAlert className="size-4" />
            Failed to load providers
          </div>
        ) : !endpoints || endpoints.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No provider details for this model.
          </p>
        ) : (
          sortEndpoints(modelId, endpoints, endpointSort).map((endpoint) => {
            const slug = providerSlugFromTag(endpoint.tag);
            const position = pinnedSlugs.indexOf(slug);
            return (
              <EndpointRow
                key={endpoint.tag}
                endpoint={endpoint}
                official={isOfficialEndpoint(modelId, endpoint)}
                position={position === -1 ? null : position + 1}
                selectable={canPick}
                onToggle={() => toggleProvider(slug)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function EndpointRow({
  endpoint,
  official,
  position,
  selectable,
  onToggle,
}: {
  endpoint: OpenRouterModelEndpoint;
  official: boolean;
  position: number | null;
  selectable: boolean;
  onToggle: () => void;
}) {
  const maxOutput = endpoint.max_completion_tokens;
  const lowOutput = typeof maxOutput === "number" && maxOutput < LOW_OUTPUT_CAP_TOKENS;
  const cacheRead = endpoint.pricing.input_cache_read;
  const uptime = endpoint.uptime_last_1d;
  const quantization =
    endpoint.quantization && endpoint.quantization !== "unknown" ? endpoint.quantization : null;

  const content = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
            position
              ? "bg-primary text-primary-content"
              : "bg-[color-mix(in_oklch,var(--color-base-content)_8%,transparent)] text-muted-foreground",
          )}
          aria-hidden
        >
          {position ?? ""}
        </span>
        <span className="truncate font-medium text-foreground">{endpoint.provider_name}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">{endpoint.tag}</span>
        {official ? (
          <Badge variant="outline" className="gap-1 text-primary">
            <BadgeCheck className="size-3" />
            Official
          </Badge>
        ) : null}
      </span>
      <span className="flex flex-wrap items-center gap-1.5 pl-7 text-xs text-muted-foreground">
        <span>
          {formatModelPrice(endpoint.pricing.prompt)} in ·{" "}
          {formatModelPrice(endpoint.pricing.completion)} out
        </span>
        {cacheRead ? <span>· cached {formatModelPrice(cacheRead)}</span> : null}
        <span>· {formatTokenCount(endpoint.context_length)} ctx</span>
        {typeof maxOutput === "number" ? (
          <span className={cn(lowOutput && "text-warning")}>
            · {formatTokenCount(maxOutput)} out
          </span>
        ) : null}
        {quantization ? <span>· {quantization}</span> : null}
        {typeof uptime === "number" ? <span>· {uptime.toFixed(1)}% up</span> : null}
        {!supportsTools(endpoint) ? (
          <Badge variant="outline" className="text-destructive">
            No tool use
          </Badge>
        ) : null}
      </span>
    </>
  );

  const className = cn(
    "flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left text-sm",
    position && "bg-[color-mix(in_oklch,var(--color-primary)_10%,transparent)]",
  );

  if (!selectable) {
    return (
      <div className={className} data-test="provider-routing-endpoint">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={position !== null}
      className={cn(
        className,
        "transition-colors hover:bg-[color-mix(in_oklch,var(--color-primary)_8%,transparent)]",
      )}
      data-test="provider-routing-endpoint"
    >
      {content}
    </button>
  );
}
