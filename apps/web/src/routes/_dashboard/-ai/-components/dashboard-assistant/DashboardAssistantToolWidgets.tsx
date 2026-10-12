import { Button } from "@/components/ui/button";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { jobListLabel } from "@/data-access-layer/event-sourced/job-rows";
import { ChatText } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiMarkdown";
import { ResumeAiThinkingBlock } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiThinkingBlock";
import {
  ToolCallPanel,
  ToolResultPanel,
} from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiToolPanels";
import type { PartProps, ToolProps } from "@tanstack/ai-react/ui";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Copy, FileText, MessageSquareQuote } from "lucide-react";
import type {
  DashboardAssistantChatOptions,
  DashboardAssistantToolName,
} from "./dashboard-assistant-chat-options";

export function DashboardTextPart({ part }: PartProps<DashboardAssistantChatOptions, "text">) {
  return part.content.trim() ? <ChatText content={part.content} /> : null;
}

export function DashboardThinkingPart({
  part,
}: PartProps<DashboardAssistantChatOptions, "thinking">) {
  return part.content.trim() ? (
    <ResumeAiThinkingBlock content={part.content} defaultOpen={false} />
  ) : null;
}

/** A result whose call is in another message; results next to their call render inside the call. */
export function DashboardToolResultPart({
  part,
}: PartProps<DashboardAssistantChatOptions, "toolResult">) {
  return (
    <ToolResultPanel
      part={{
        toolCallId: part.toolCallId,
        content: typeof part.content === "string" ? part.content : JSON.stringify(part.content),
        state: part.state,
        error: part.error,
      }}
    />
  );
}

/** Generic so one component fills every tool's slot, each typed for its own name. */
export function DashboardToolCall<TName extends DashboardAssistantToolName>({
  part,
  result,
}: ToolProps<DashboardAssistantChatOptions, TName>) {
  return (
    <ToolCallPanel
      part={{
        id: part.id,
        name: part.name,
        arguments: part.arguments,
        state: part.state,
        output: part.output,
        ...(result?.error ? { error: result.error } : {}),
      }}
    />
  );
}

/** Asks before copying or opening a résumé, then links to it once it is ready. */
export function DashboardStartResumeTool({
  part,
  result,
  interrupt,
}: ToolProps<DashboardAssistantChatOptions, "start_resume_for_job">) {
  const db = useEventSourcedDb();

  if (part.output) {
    return (
      <Link
        to="/resumes/$resumeId"
        params={{ resumeId: part.output.resumeId }}
        search={{ tab: "ai" }}
        className="flex items-center gap-3 rounded-lg p-3 ring-1 ring-primary/40 transition-colors hover:bg-primary/5"
        data-test="dashboard-assistant-started-resume"
      >
        <FileText className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{part.output.name}</span>
          <span className="block text-xs text-muted-foreground">
            {part.output.mode === "copy" ? "New copy" : "Reused as it is"} · opens in the editor's
            assistant
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    );
  }

  if (!interrupt) return <DashboardToolCall part={part} result={result} />;

  const args = interrupt.originalArgs;
  const resumeName = db.collections.resume.get(args.resumeId)?.name ?? "this résumé";
  const job = db.collections.job.get(args.jobId);
  const jobLabel = job ? jobListLabel(job) : "this job";
  const isCopy = args.mode === "copy";
  const busy = interrupt.status !== "pending" && interrupt.status !== "error";

  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-3 ring-1 ring-primary/40"
      data-test="dashboard-assistant-approval"
    >
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {isCopy ? (
            <Copy className="size-4 shrink-0 text-primary" aria-hidden />
          ) : (
            <FileText className="size-4 shrink-0 text-primary" aria-hidden />
          )}
          <span className="min-w-0">
            {isCopy ? "Copy" : "Use"} “{resumeName}” for {jobLabel}
          </span>
        </p>
        <p className="text-xs leading-5 text-muted-foreground">{args.reason}</p>
      </div>
      <div className="flex gap-2 rounded-lg bg-base-200/60 p-2.5 text-xs leading-5">
        <MessageSquareQuote
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <p className="min-w-0">
          <span className="text-muted-foreground">First prompt in the editor: </span>
          {args.suggestedPrompt}
        </p>
      </div>
      {interrupt.errors[0] ? (
        <p className="text-xs text-destructive">{interrupt.errors[0].message}</p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => interrupt.resolveInterrupt(false)}
          data-test="dashboard-assistant-approval-deny"
        >
          Not this one
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() => interrupt.resolveInterrupt(true)}
          data-test="dashboard-assistant-approval-approve"
        >
          {isCopy ? "Copy and open" : "Open résumé"}
        </Button>
      </div>
    </div>
  );
}
