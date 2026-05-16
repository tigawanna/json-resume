import { useOpenRouterCredits } from "@/hooks/use-openrouter-credits";
import { Coins, Hash } from "lucide-react";

export function CreditsDisplay({ apiKey, sessionChars }: { apiKey: string; sessionChars: number }) {
  const { data, isLoading, isError, error } = useOpenRouterCredits(apiKey);

  if (isLoading) return <span className="text-xs text-muted-foreground">Checking credits...</span>;

  if (isError) {
    const message = error instanceof Error ? error.message : "Failed to load credits";
    return <span className="text-xs text-destructive">{message}</span>;
  }

  if (!data) return null;

  const remaining = data.remaining_credits_display ?? data.total_credits - data.total_usage;

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <Coins className="size-3" />
      <span>{formatCreditAmount(remaining)} remaining</span>
      <span className="text-primary/30">·</span>
      <span>{formatCreditAmount(data.total_usage)} used</span>
      {sessionChars > 0 ? (
        <>
          <span className="text-primary/30">·</span>
          <Hash className="size-3" />
          <span>{formatTokenCount(sessionChars)} tokens this session</span>
        </>
      ) : null}
    </span>
  );
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
