import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Box, ChevronDown, ExternalLink } from "lucide-react";
import { formatPayload, getCreatedResumeOutput, getToolLabel } from "./resume-ai-message-utils";
import type { CreatedResumeOutput, ToolCallViewPart, ToolResultViewPart } from "./resume-ai-types";

function CreatedResumeCard({ output }: { output: CreatedResumeOutput }) {
  return (
    <div
      className="mt-3 rounded-lg bg-[color-mix(in_oklch,var(--color-success)_9%,var(--color-base-100))] p-3 text-sm ring-1 ring-[color-mix(in_oklch,var(--color-success)_25%,transparent)]"
      data-test="resume-ai-created-resume-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
          <Box className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{output.name ?? "New resume draft"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Created and ready to review.</p>
        </div>
        <Button asChild size="sm" className="h-8 shrink-0 gap-1.5 rounded-lg">
          <Link
            to="/resumes/$resumeId"
            params={{ resumeId: output.resumeId }}
            search={{ tab: "preview" }}
            data-test="resume-ai-open-created-resume"
          >
            Open
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function ToolCallPanel({ part }: { part: ToolCallViewPart }) {
  const createdResume = getCreatedResumeOutput(part);
  const input = formatPayload(part.arguments);
  const output = part.output === undefined ? "" : formatPayload(part.output);

  return (
    <details
      className="group rounded-lg bg-[color-mix(in_oklch,var(--color-base-content)_6%,transparent)] px-3 py-2 text-xs text-muted-foreground"
      data-test="resume-ai-tool-call"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-foreground/80 marker:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-primary" />
          <span className="truncate">{getToolLabel(part.name)}</span>
          <span className="rounded-full bg-base-100 px-2 py-0.5 text-[0.68rem] text-muted-foreground">
            {part.state}
          </span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      {createdResume ? <CreatedResumeCard output={createdResume} /> : null}
      <div className="mt-3 grid gap-2">
        {input ? <PayloadBlock label="Input" value={input} /> : null}
        {output ? <PayloadBlock label="Output" value={output} /> : null}
      </div>
    </details>
  );
}

export function ToolResultPanel({ part }: { part: ToolResultViewPart }) {
  const content = formatPayload(part.content);

  return (
    <details
      className="group rounded-lg bg-[color-mix(in_oklch,var(--color-success)_10%,transparent)] px-3 py-2 text-xs text-muted-foreground"
      data-test="resume-ai-tool-result"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-foreground/80 marker:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-success" />
          <span>Tool result</span>
          <span className="rounded-full bg-base-100 px-2 py-0.5 text-[0.68rem] text-muted-foreground">
            {part.state}
          </span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 grid gap-2">
        {part.error ? (
          <p className="rounded-md bg-destructive/10 p-2 text-destructive">{part.error}</p>
        ) : null}
        {content ? <PayloadBlock label={null} value={content} /> : null}
      </div>
    </details>
  );
}

function PayloadBlock({ label, value }: { label: string | null; value: string }) {
  return (
    <div>
      {label ? <p className="mb-1 font-medium text-foreground/70">{label}</p> : null}
      <pre className="max-h-56 overflow-auto rounded-md bg-base-100 p-2 text-[0.7rem] leading-5 text-foreground">
        {value}
      </pre>
    </div>
  );
}
