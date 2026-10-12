import { CreatedResumeCard } from "@/components/agentic-tools/CreatedResumeCard";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import type { CreatedResumeOutput } from "@/features/agentic-tools/created-resume-output";
import type { PartProps, ToolProps } from "@tanstack/ai-react/ui";
import { ChevronDown, ShieldAlert } from "lucide-react";
import { useResumeWorkbench } from "../resume-workbench/ResumeWorkbenchProvider";
import { ChatText } from "./ResumeAiMarkdown";
import { ResumeAiThinkingBlock } from "./ResumeAiThinkingBlock";
import { ToolCallPanel, ToolResultPanel } from "./ResumeAiToolPanels";
import { useResumeAiChatActions } from "./resume-ai-chat-actions";
import type { ResumeAiChatOptions, ResumeAiToolName } from "./resume-ai-chat-options";

export function ResumeAiTextPart({ part }: PartProps<ResumeAiChatOptions, "text">) {
  return part.content.trim() ? <ChatText content={part.content} /> : null;
}

export function ResumeAiThinkingPart({ part }: PartProps<ResumeAiChatOptions, "thinking">) {
  const { isBusy } = useResumeAiChatActions();
  return part.content.trim() ? (
    <ResumeAiThinkingBlock content={part.content} defaultOpen={isBusy} />
  ) : null;
}

/** A result whose call is in another message; results next to their call render inside the call. */
export function ResumeAiToolResultPart({ part }: PartProps<ResumeAiChatOptions, "toolResult">) {
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
export function ResumeAiToolCall<TName extends ResumeAiToolName>({
  part,
  result,
}: ToolProps<ResumeAiChatOptions, TName>) {
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

function CreatedResumeToolView<TName extends ResumeAiToolName>({
  part,
  result,
  created,
}: ToolProps<ResumeAiChatOptions, TName> & { created: CreatedResumeOutput | undefined }) {
  return (
    <>
      <ResumeAiToolCall part={part} result={result} />
      {created ? (
        <CreatedResumeCard output={created} dataTest="resume-ai-created-resume-card" />
      ) : null}
    </>
  );
}

export function ResumeAiCreateResumeTool({
  part,
  result,
}: ToolProps<ResumeAiChatOptions, "create_resume">) {
  return <CreatedResumeToolView part={part} result={result} created={part.output ?? undefined} />;
}

export function ResumeAiCloneResumeTool({
  part,
  result,
}: ToolProps<ResumeAiChatOptions, "clone_resume">) {
  return <CreatedResumeToolView part={part} result={result} created={part.output ?? undefined} />;
}

export function ResumeAiTailorResumeTool({
  part,
  result,
}: ToolProps<ResumeAiChatOptions, "tailor_resume_for_job">) {
  return <CreatedResumeToolView part={part} result={result} created={part.output ?? undefined} />;
}

export function ResumeAiReplaceDocumentTool({
  part,
  result,
  interrupt,
}: ToolProps<ResumeAiChatOptions, "replace_resume_document">) {
  const db = useEventSourcedDb();
  const activeResumeId = useResumeWorkbench((state) => state.ai.activeResumeId);
  if (!interrupt) return <ResumeAiToolCall part={part} result={result} />;

  const targetId = interrupt.originalArgs.resumeId || activeResumeId;
  const busy = interrupt.status !== "pending" && interrupt.status !== "error";

  return (
    <div
      className="flex flex-col gap-3 rounded-lg p-3 ring-1 ring-warning/60"
      data-test="ai-tool-approval-replace_resume_document"
    >
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert className="size-4 text-warning" aria-hidden />
          {targetId
            ? `Rewrite "${db.collections.resume.get(targetId)?.name ?? targetId}"`
            : "Rewrite a résumé"}
        </p>
        <p className="text-xs text-muted-foreground">
          The assistant wants to replace this résumé's whole content. Library items are reused where
          they match.
        </p>
      </div>
      <Collapsible>
        <CollapsibleTrigger
          className="flex items-center gap-1 text-xs text-base-content/70 hover:text-base-content"
          data-test="ai-tool-approval-toggle-args"
        >
          <ChevronDown className="size-3" aria-hidden />
          Show what will be written
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-base-200 p-3 text-xs">
            {JSON.stringify(interrupt.originalArgs.document, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
      {interrupt.errors[0] ? (
        <p className="text-xs text-destructive">{interrupt.errors[0].message}</p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => interrupt.resolveInterrupt(false)}
          data-test="ai-tool-approval-deny"
        >
          Deny
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() => interrupt.resolveInterrupt(true)}
          data-test="ai-tool-approval-approve"
        >
          Approve
        </Button>
      </div>
    </div>
  );
}
