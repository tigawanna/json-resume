import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useOpenRouterCredits, useOpenRouterKeyLimits } from "@/lib/openrouter/credits";
import type { OpenRouterKeyLimits } from "@/lib/openrouter/types";
import { TriangleAlert } from "lucide-react";

export function CreditsDisplay({
  apiKey,
  sessionChars,
  onOpenSettings,
}: {
  apiKey: string;
  sessionChars: number;
  onOpenSettings?: () => void;
}) {
  const { data, isLoading, isError, error } = useOpenRouterCredits(apiKey);
  const keyLimits = useOpenRouterKeyLimits(apiKey);

  if (isLoading) return <span className="text-xs text-muted-foreground">Checking credits...</span>;

  if (isError) {
    const message = error instanceof Error ? error.message : "Failed to load credits";
    if (message.toLocaleLowerCase().includes("invalid"))
      return (
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Invalid API key. Open AI settings"
          title="Invalid API key. Open AI settings"
          className="flex items-center gap-1.5 p-1 text-destructive bg-destructive/10 rounded-md hover:bg-destructive/20 transition-colors"
          data-test="resume-ai-credits-invalid-key"
        >
          <TriangleAlert className="size-3 text-destructive" /> check settings
        </button>
      );
    return <span className="text-xs text-destructive p-1">{message}</span>;
  }

  if (!data) return null;

  const balance = data.remaining_credits_display ?? data.total_credits - data.total_usage;
  const figures = spendFigures(balance, keyLimits.data);
  const chip =
    figures.kind === "capped"
      ? `${formatCreditCompact(figures.used)}/${formatCreditCompact(figures.cap)}/${formatCreditCompact(figures.balance)}`
      : formatCreditCompact(figures.balance);

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={
            figures.kind === "capped" && figures.blocked
              ? "inline-flex items-center gap-1 font-mono text-xs text-destructive tabular-nums"
              : "inline-flex items-center gap-1 font-mono text-xs text-muted-foreground tabular-nums"
          }
          data-test="resume-ai-key-spend-limit"
        >
          {figures.kind === "capped" && figures.blocked ? (
            <TriangleAlert className="size-3" />
          ) : null}
          {chip}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-72 text-xs">
        <dl className="grid gap-2">
          {figures.kind === "capped" ? (
            <>
              <SpendRow
                label="Used"
                value={formatCreditAmount(figures.used)}
                detail="Spent against this key's limit in the current window."
              />
              <SpendRow
                label="Limit"
                value={formatCreditAmount(figures.cap)}
                detail={
                  figures.reset
                    ? `Cap on this API key. Resets ${figures.reset}.`
                    : "Cap on this API key. It does not reset."
                }
              />
            </>
          ) : (
            <p>This key has no spend limit. A request can use the whole account balance.</p>
          )}
          <SpendRow
            label="Balance"
            value={formatCreditAmount(figures.balance)}
            detail="Credits left on the OpenRouter account. A request can still fail when the key limit is spent."
          />
          {sessionChars > 0 ? (
            <SpendRow
              label="This session"
              value={formatTokenCount(sessionChars)}
              detail="Rough token count from characters sent in this chat."
            />
          ) : null}
        </dl>
      </HoverCardContent>
    </HoverCard>
  );
}

function SpendRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="grid gap-0.5">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-mono tabular-nums">{value}</dd>
      </div>
      <p className="text-muted-foreground">{detail}</p>
    </div>
  );
}

/** Used, key cap, and account balance. A key with no cap only has a balance. */
function spendFigures(balance: number, limits: OpenRouterKeyLimits | undefined) {
  const budget = limits?.effective_budget;
  const cap = budget?.limit_usd ?? limits?.limit;
  const remaining = budget?.remaining_usd ?? limits?.limit_remaining;
  if (cap == null || remaining == null) return { kind: "balance" as const, balance };
  return {
    kind: "capped" as const,
    used: Math.max(0, cap - remaining),
    cap,
    balance,
    reset: budget?.reset_interval ?? limits?.limit_reset ?? null,
    blocked: remaining <= 0,
  };
}

function formatCreditCompact(amount: number) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCreditAmount(amount: number) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatTokenCount(chars: number): string {
  const tokens = Math.round(chars / 4);
  if (tokens >= 1_000_000) return `~${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `~${(tokens / 1_000).toFixed(1)}k`;
  return `~${tokens}`;
}
