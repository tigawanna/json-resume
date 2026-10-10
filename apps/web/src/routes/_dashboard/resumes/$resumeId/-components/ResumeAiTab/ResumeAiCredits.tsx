import { useOpenRouterCredits } from "@/hooks/use-openrouter-credits";
import { Coins, Hash, TriangleAlert } from "lucide-react";

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

  const remaining = data.remaining_credits_display ?? data.total_credits - data.total_usage;

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Coins className="size-3" />
        {formatCreditAmount(remaining)} balance
      </span>
      {sessionChars > 0 ? (
        <span className="flex items-center gap-1.5">
          <Hash className="size-3" />
          {formatTokenCount(sessionChars)} tokens this session
        </span>
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
