import { PromptArea } from "@/components/prompt-area/prompt-area";
import {
  commandTrigger,
  hashtagTrigger,
  mentionTrigger,
} from "@/components/prompt-area/trigger-presets";
import type { PromptAreaHandle, Segment } from "@/components/prompt-area/types";
import { Button } from "@/components/ui/button";
import { useEventSourcedDb } from "@/data-access-layer/event-sourced/provider";
import { cn } from "@/lib/utils";
import { ChatErrorNotice } from "@/routes/_dashboard/-ai/-components/ChatErrorNotice";
import { listLocalResumes } from "@/routes/_dashboard/-ai/-utils/local-resume-tools";
import { ArrowUp, FileText, LoaderCircle, Plus, Square, X } from "lucide-react";
import { useState, type RefObject } from "react";
import {
  useResumeWorkbench,
  useResumeWorkbenchActions,
} from "../resume-workbench/ResumeWorkbenchProvider";
import { ResumeAiAttachSheet } from "./ResumeAiAttachSheet";
import { CreditsDisplay } from "./ResumeAiCredits";
import { DIRECTIVES, SECTION_TAGS } from "./resume-ai-directives";
import {
  attachChip,
  attachedChips,
  hasText,
  serializeSegments,
  type AttachChipData,
} from "./resume-ai-prompt";

export interface ActiveResumeSummary {
  id: string;
  name: string;
  isPageResume: boolean;
}

export interface ResumeAiPromptComposerProps {
  activeModelLabel: string | null;
  /** Null when the user detached the résumé from the conversation. */
  activeResume: ActiveResumeSummary | null;
  activeRoutingLabel: string | null;
  apiKey: string | null;
  /** A tool approval is pending; sending declines it. */
  awaitingApproval: boolean;
  errorMessage: string | null;
  hasMessages: boolean;
  isBusy: boolean;
  isReady: boolean;
  onSend: (message: string) => void | Promise<void>;
  /** Re-runs the failed request: resends the prompt, or asks to continue a partial run. */
  onRetry: () => void | Promise<void>;
  onStop: () => void;
  promptAreaRef: RefObject<PromptAreaHandle | null>;
  sessionChars: number;
  sessionGenerating: boolean;
  status: string;
}

const emptyChatPlaceholders = [
  "Ask for a fit analysis, a rewritten summary, better bullets, or a tailored draft...",
  "Type / for directives, # to focus a section, @ to reference another resume...",
];

export function ResumeAiPromptComposer({
  activeModelLabel,
  activeResume,
  activeRoutingLabel,
  apiKey,
  awaitingApproval,
  errorMessage,
  hasMessages,
  isBusy,
  isReady,
  onSend,
  onRetry,
  onStop,
  promptAreaRef,
  sessionChars,
  sessionGenerating,
  status,
}: ResumeAiPromptComposerProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const db = useEventSourcedDb();
  const currentResumeId = useResumeWorkbench((state) => state.resumeId);
  const { openDialog, resetActiveResume, detachActiveResume } = useResumeWorkbenchActions();
  const attachedIds = attachedChips(segments).map((item) => item.id);

  function insertAttachment(item: AttachChipData) {
    promptAreaRef.current?.insertChip(attachChip(item));
    promptAreaRef.current?.focus();
  }

  async function searchResumeMentions(query: string) {
    const page = await listLocalResumes({ db }, { keyword: query, limit: 8 });
    return page.resumes
      .filter((resume) => resume.id !== currentResumeId)
      .map((resume) => {
        const chip = attachChip({ kind: "resume", id: resume.id, name: resume.name });
        return {
          value: resume.id,
          label: resume.name,
          description: resume.headline || undefined,
          data: chip.data,
        };
      });
  }

  function handleSend(nextSegments: Segment[]) {
    const message = serializeSegments(nextSegments);
    if (!message || !isReady) return;
    const result = onSend(message);
    setSegments([]);
    promptAreaRef.current?.focus();
    return result;
  }

  let placeholder: string | string[] = emptyChatPlaceholders;
  if (!isReady) placeholder = "Configure your OpenRouter API key in settings to start chatting...";
  else if (awaitingApproval)
    placeholder = "Approve the change above, or reply here to decline it...";
  else if (isBusy) placeholder = "Queue a follow-up, it sends when this reply finishes...";
  else if (hasMessages) placeholder = "Ask for another change...";

  return (
    <div className="mx-auto w-full max-w-3xl" data-test="resume-ai-composer">
      {errorMessage && !isBusy ? (
        <ChatErrorNotice
          message={errorMessage}
          onRetry={() => void onRetry()}
          onOpenSettings={() => openDialog("ai-settings")}
          retryDisabled={!isReady}
          className="mb-3"
        />
      ) : null}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await handleSend(segments);
        }}
        className="flex flex-col gap-2"
        data-test="resume-ai-composer-form"
      >
        <div
          className="overflow-hidden rounded-2xl border border-base-content/15 bg-primary/10 text-base-content shadow-sm"
          data-test="resume-ai-input-shell"
        >
          <PromptArea
            ref={promptAreaRef}
            value={segments}
            onChange={setSegments}
            onSubmit={handleSend}
            placeholder={placeholder}
            disabled={!isReady}
            markdown
            normalizeBullets={false}
            triggers={[
              commandTrigger({
                position: "start",
                emptyMessage: "No matching directive",
                chipClassName: "rounded-md bg-primary/15 px-1 font-medium text-primary",
                resolveOnSpace: true,
                onSelect: (suggestion) => suggestion.value.replace(/^\//, ""),
                onSearch: (query) =>
                  DIRECTIVES.filter(
                    (directive) =>
                      directive.command.includes(query.toLowerCase()) ||
                      directive.label.toLowerCase().includes(query.toLowerCase()),
                  ).map((directive) => ({
                    value: directive.command,
                    label: directive.command,
                    description: directive.label,
                  })),
              }),
              mentionTrigger({
                emptyMessage: "No other resumes",
                searchDebounceMs: 150,
                chipClassName: "rounded-md bg-primary/15 px-1 font-medium text-primary",
                onSearch: searchResumeMentions,
              }),
              hashtagTrigger({
                resolveOnSpace: false,
                emptyMessage: "No matching section",
                onSelect: (suggestion) => suggestion.value,
                onSearch: (query) =>
                  SECTION_TAGS.filter((tag) => tag.value.includes(query.toLowerCase())).map(
                    (tag) => ({
                      value: tag.value,
                      label: `#${tag.value}`,
                      description: tag.description,
                    }),
                  ),
              }),
            ]}
            minHeight={26}
            maxHeight={240}
            className="px-4 pt-3 pb-1 text-base [--prompt-area-placeholder:color-mix(in_oklch,var(--color-base-content)_35%,transparent)]"
            aria-label="Ask the resume AI"
            data-test-id="resume-ai-input"
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex min-w-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground shrink-0"
                aria-label="Attach context"
                disabled={!isReady}
                onClick={() => setAttachOpen(true)}
                data-test="resume-ai-attach"
              >
                <Plus className="size-4" />
              </Button>
              <button
                type="button"
                onClick={() => openDialog("ai-settings")}
                className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors"
                data-test="resume-ai-model-selector"
              >
                <span className="truncate font-medium">
                  {activeModelLabel ?? (isReady ? "Default model" : "Set up a model")}
                </span>
                {activeRoutingLabel ? (
                  <span className="truncate opacity-70">· {activeRoutingLabel}</span>
                ) : null}
              </button>
              <ActiveResumeChip
                activeResume={activeResume}
                onReset={resetActiveResume}
                onDetach={detachActiveResume}
              />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isBusy ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  aria-label="Stop generating"
                  onClick={onStop}
                  data-test="resume-ai-stop"
                >
                  <Square className="size-3.5" />
                </Button>
              ) : null}
              <Button
                type="submit"
                size="icon-sm"
                aria-label={isBusy ? "Queue message" : "Send message"}
                disabled={!hasText(segments) || !isReady}
                data-test="resume-ai-send"
              >
                <ArrowUp className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </form>
      {isBusy || sessionGenerating || apiKey ? (
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-xs text-muted-foreground"
          data-test="resume-ai-status"
        >
          {isBusy || sessionGenerating ? (
            <span className="flex items-center gap-1.5">
              <LoaderCircle className="size-3 animate-spin text-primary" />
              {getChatStatusLabel(status, isBusy, sessionGenerating)}
            </span>
          ) : null}
          {apiKey ? (
            <CreditsDisplay
              apiKey={apiKey}
              sessionChars={sessionChars}
              onOpenSettings={() => openDialog("ai-settings")}
            />
          ) : null}
        </div>
      ) : null}
      <ResumeAiAttachSheet
        open={attachOpen}
        onOpenChange={setAttachOpen}
        activeResumeId={activeResume?.id ?? null}
        attachedIds={attachedIds}
        onAttach={insertAttachment}
      />
    </div>
  );
}

function ActiveResumeChip({
  activeResume,
  onReset,
  onDetach,
}: {
  activeResume: ActiveResumeSummary | null;
  onReset: () => void;
  onDetach: () => void;
}) {
  if (!activeResume) {
    return (
      <button
        type="button"
        onClick={onReset}
        title="Let the assistant work on this page's résumé again"
        className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-base-content/20 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-base-content/40 hover:text-foreground"
        data-test="resume-ai-attach-page-resume"
      >
        <FileText className="size-3 shrink-0" />
        Use this résumé
      </button>
    );
  }

  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1 rounded-full py-0.5 pr-0.5 pl-2 text-xs",
        activeResume.isPageResume
          ? "text-muted-foreground"
          : "bg-primary/15 font-medium text-primary",
      )}
      title={
        activeResume.isPageResume
          ? "The assistant edits this résumé"
          : "The assistant is editing another résumé"
      }
      data-test="resume-ai-active-resume"
    >
      <FileText className="size-3 shrink-0" />
      <span className="max-w-40 truncate">{activeResume.name}</span>
      {activeResume.isPageResume ? (
        <button
          type="button"
          onClick={onDetach}
          aria-label="Remove this résumé from the conversation"
          title="Remove this résumé from the conversation"
          className="flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-base-content/10 hover:text-foreground"
          data-test="resume-ai-active-resume-detach"
        >
          <X className="size-3" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onReset}
          aria-label="Edit this page's résumé instead"
          title="Edit this page's résumé instead"
          className="flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-primary/20"
          data-test="resume-ai-active-resume-reset"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

function getChatStatusLabel(status: string, isLoading: boolean, sessionGenerating: boolean) {
  if (status === "submitted") return "Request sent";
  if (status === "streaming") return "Streaming response";
  if (sessionGenerating) return "Generating";
  if (isLoading) return "Working";
  if (status === "error") return "Needs attention";
  return "Ready";
}
