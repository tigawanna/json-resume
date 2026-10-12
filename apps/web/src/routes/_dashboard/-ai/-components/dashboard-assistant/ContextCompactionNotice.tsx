import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FoldVertical } from "lucide-react";
import { formatApproxTokens, type ContextCompaction } from "../../-utils/context-compaction";

function compactionSummary(compaction: ContextCompaction) {
  return `${formatApproxTokens(compaction.before)} → ${formatApproxTokens(compaction.after)} tokens`;
}

/** Shown in the message stream while the current reply runs on compacted context. */
export function ContextCompactionLiveNotice({
  compaction,
}: {
  /** `null` while compaction is still running. */
  compaction: ContextCompaction | null;
}) {
  return (
    <div
      role="status"
      className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"
      data-test="dashboard-assistant-compaction-live"
    >
      <span aria-hidden className="h-px flex-1 bg-border/70" />
      <span className="flex items-center gap-1.5">
        <FoldVertical className={cn("size-3.5", !compaction && "animate-pulse text-primary")} />
        {compaction
          ? `Compacted older messages · ${compactionSummary(compaction)}`
          : "Compacting older messages…"}
      </span>
      <span aria-hidden className="h-px flex-1 bg-border/70" />
    </div>
  );
}

/** Quiet footer marker that the model no longer sees the full history. */
export function ContextCompactionBadge({ compaction }: { compaction: ContextCompaction }) {
  const dropped = compaction.messagesBefore - compaction.messagesAfter;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md p-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          data-test="dashboard-assistant-compaction-badge"
        >
          <FoldVertical className="size-3" />
          Context compacted
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64">
        To stay under {formatApproxTokens(compaction.maxTokens)} tokens, the model gets a trimmed
        history
        {dropped > 0 ? `, without the ${dropped} oldest message${dropped === 1 ? "" : "s"}` : ""} (
        {compactionSummary(compaction)}). Your conversation here stays complete.
      </TooltipContent>
    </Tooltip>
  );
}
