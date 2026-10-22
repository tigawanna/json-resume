import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronDown, Copy, Wrench } from "lucide-react";
import { toast } from "sonner";
import { formatPayload, getToolLabel } from "./resume-ai-message-utils";
import type { ToolCallViewPart, ToolResultViewPart } from "./resume-ai-types";

export function ToolCallPanel({ part }: { part: ToolCallViewPart }) {
  const input = formatPayload(part.arguments);
  const output = part.output === undefined ? "" : formatPayload(part.output);

  return (
    <details
      className="group min-w-0 max-w-full overflow-hidden rounded-md py-1 text-xs text-muted-foreground/80"
      data-test="resume-ai-tool-call"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 py-1 font-medium marker:hidden">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Wrench className="size-3.5 shrink-0 text-muted-foreground/70" />
          <span className="truncate text-foreground/80">{getToolLabel(part.name)}</span>
          <span className="shrink-0 rounded-full bg-[color-mix(in_oklch,var(--color-base-content)_8%,transparent)] px-2 py-0.5 text-[0.68rem] text-muted-foreground">
            {part.error ? "error" : part.state}
          </span>
        </span>
        <RowCopyButton
          text={[input, output].filter(Boolean).join("\n\n")}
          label="Copy tool call"
          dataTest="resume-ai-tool-call-copy"
        />
        <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 grid min-w-0 gap-2 pl-5">
        {part.error ? (
          <p className="rounded-md bg-destructive/10 p-2 text-destructive">{part.error}</p>
        ) : null}
        {input ? <PayloadBlock label="Parameters" value={input} /> : null}
        {output ? <PayloadBlock label="Response" value={output} /> : null}
      </div>
    </details>
  );
}

export function ToolResultPanel({ part }: { part: ToolResultViewPart }) {
  const content = formatPayload(part.content);

  return (
    <details
      className="group min-w-0 max-w-full overflow-hidden rounded-md py-1 text-xs text-muted-foreground/80"
      data-test="resume-ai-tool-result"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 py-1 font-medium marker:hidden">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground/70" />
          <span className="truncate text-foreground/80">Tool result</span>
          <span className="shrink-0 rounded-full bg-[color-mix(in_oklch,var(--color-base-content)_8%,transparent)] px-2 py-0.5 text-[0.68rem] text-muted-foreground">
            {part.state}
          </span>
        </span>
        <RowCopyButton
          text={content}
          label="Copy tool result"
          dataTest="resume-ai-tool-result-copy"
        />
        <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 grid min-w-0 gap-2 pl-5">
        {part.error ? (
          <p className="rounded-md bg-destructive/10 p-2 text-destructive">{part.error}</p>
        ) : null}
        {content ? <PayloadBlock label="Response" value={content} /> : null}
      </div>
    </details>
  );
}

function RowCopyButton({
  text,
  label,
  dataTest,
}: {
  text: string;
  label: string;
  dataTest: string;
}) {
  async function copy(event: { stopPropagation: () => void; preventDefault: () => void }) {
    event.stopPropagation();
    event.preventDefault();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch (err: unknown) {
      toast.error("Could not copy", {
        description: err instanceof Error ? err.message : "Clipboard is unavailable",
      });
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={!text}
      onClick={(event) => void copy(event)}
      className="size-6 shrink-0 rounded-md text-muted-foreground hover:bg-primary/30 hover:text-primary"
      data-test={dataTest}
      title={label}
      aria-label={label}
    >
      <Copy className="size-3.5" />
    </Button>
  );
}

function PayloadBlock({ label, value }: { label: string | null; value: string }) {
  return (
    <div className="min-w-0 max-w-full">
      {label ? (
        <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-normal text-muted-foreground">
          {label}
        </p>
      ) : null}
      <pre className="max-h-64 max-w-full overflow-auto rounded-md bg-[color-mix(in_oklch,var(--color-base-content)_5%,transparent)] p-3 text-[0.7rem] leading-5 text-muted-foreground">
        {value}
      </pre>
    </div>
  );
}
