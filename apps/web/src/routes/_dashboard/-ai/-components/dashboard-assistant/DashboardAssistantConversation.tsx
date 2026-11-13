import { DotsPulse } from "@/components/loaders/DotsPulse";
import { PromptArea } from "@/components/prompt-area/prompt-area";
import type { PromptAreaHandle, Segment } from "@/components/prompt-area/types";
import { Button } from "@/components/ui/button";
import { CreditsDisplay } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiCredits";
import { ResumeAiAttachSheet } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiAttachSheet";
import {
  attachChip,
  attachedChips,
  hasText,
  serializeSegments,
} from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-prompt";
import { chatMessagesEqual } from "../../-utils/chat-message-equal";
import { ArrowUp, Plus, Square } from "lucide-react";
import { memo, useState, type RefObject } from "react";
import type { ContextCompaction } from "../../-utils/context-compaction";
import { ChatErrorNotice } from "../ChatErrorNotice";
import { ContextCompactionBadge, ContextCompactionLiveNotice } from "./ContextCompactionNotice";
import type { DashboardAssistantChat } from "./dashboard-assistant-chat-options";
import { DashboardAssistantChatUI } from "./dashboard-assistant-chat-ui";

type DashboardMessage = Parameters<typeof DashboardAssistantChatUI.Message>[0]["message"];

const StableDashboardMessage = memo(
  function StableDashboardMessage({ message }: { message: DashboardMessage }) {
    return <DashboardAssistantChatUI.Message message={message} />;
  },
  (prev, next) => chatMessagesEqual(prev.message, next.message),
);

interface DashboardAssistantConversationProps {
  activeModelLabel: string | null;
  activeRoutingLabel: string | null;
  apiKey: string | null;
  /** A tool approval is pending; sending declines it. */
  awaitingApproval: boolean;
  /** False until an OpenRouter key and model are saved. */
  canSend: boolean;
  chat: DashboardAssistantChat;
  compacting: boolean;
  lastCompaction: ContextCompaction | null;
  compactedThisTurn: boolean;
  composerRef: RefObject<PromptAreaHandle | null>;
  endOfMessagesRef: RefObject<HTMLDivElement | null>;
  errorMessage: string | null;
  isBusy: boolean;
  sessionChars: number;
  sessionGenerating: boolean;
  onSend: (text: string) => void | Promise<boolean | void>;
  onRetry: () => void | Promise<void>;
  onStop: () => void;
  onEscape: () => void;
  onOpenSettings: () => void;
  pageLabel: string;
  pageSummary: string;
}

export function DashboardAssistantConversation({
  activeModelLabel,
  activeRoutingLabel,
  apiKey,
  awaitingApproval,
  canSend,
  chat,
  compacting,
  lastCompaction,
  compactedThisTurn,
  composerRef,
  endOfMessagesRef,
  errorMessage,
  isBusy,
  sessionChars,
  sessionGenerating,
  onSend,
  onRetry,
  onStop,
  onEscape,
  onOpenSettings,
  pageLabel,
  pageSummary,
}: DashboardAssistantConversationProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const isEmpty = chat.messages.length === 0;
  const isWorking = isBusy || sessionGenerating;
  const attachedIds = attachedChips(segments).map((item) => item.id);

  async function handleSend(nextSegments: Segment[]) {
    const message = serializeSegments(nextSegments);
    if (!message || isBusy) return;
    const sent = await onSend(message);
    if (sent === false) return;
    setSegments([]);
  }

  let placeholder = "Ask a follow-up...";
  if (!canSend) placeholder = "Add an OpenRouter key to send...";
  else if (awaitingApproval) placeholder = "Pick an option above, or reply here to decline it...";
  else if (isEmpty) placeholder = "Ask about this page...";

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-test="dashboard-assistant-conversation">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div
            className="flex flex-1 flex-col items-center justify-center px-8 text-center"
            data-test="dashboard-assistant-intro"
          >
            <p className="max-w-xs text-base font-semibold tracking-tight text-balance">
              Ask about {pageLabel}
            </p>
            <p className="mt-2 max-w-xs text-sm text-pretty text-muted-foreground">{pageSummary}</p>
            <p className="mt-5 max-w-xs text-sm text-pretty text-muted-foreground">
              Questions use the data on this page. Use + to attach specific context.
            </p>
          </div>
        ) : (
          <DashboardAssistantChatUI.Provider chat={chat}>
            <DashboardAssistantChatUI.Messages>
              {(messages) =>
                messages.map((message) => (
                  <StableDashboardMessage key={message.id} message={message} />
                ))
              }
            </DashboardAssistantChatUI.Messages>
          </DashboardAssistantChatUI.Provider>
        )}
        {isWorking && (compacting || compactedThisTurn) ? (
          <ContextCompactionLiveNotice compaction={compacting ? null : lastCompaction} />
        ) : null}
        {isWorking ? (
          <div className="shrink-0 py-1" data-test="dashboard-assistant-working">
            <DotsPulse label="Assistant is working" />
          </div>
        ) : null}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="flex shrink-0 flex-col gap-1.5 border-t border-border/60 p-3">
        {!canSend ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-xl border border-primary/30 bg-primary/8 px-3 py-2 text-left text-xs text-base-content"
            data-test="dashboard-assistant-setup"
          >
            Add an OpenRouter key to send.
          </button>
        ) : null}
        {errorMessage && !isBusy ? (
          <ChatErrorNotice
            message={errorMessage}
            onRetry={() => void onRetry()}
            onOpenSettings={onOpenSettings}
          />
        ) : null}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSend(segments);
          }}
          className="overflow-hidden rounded-2xl border border-base-content/15 bg-primary/5"
          data-test="dashboard-assistant-composer"
        >
          <PromptArea
            ref={composerRef}
            value={segments}
            onChange={setSegments}
            onSubmit={handleSend}
            onEscape={onEscape}
            placeholder={placeholder}
            disabled={isBusy || !canSend}
            markdown
            normalizeBullets={false}
            minHeight={24}
            maxHeight={200}
            className="px-3 pt-2.5 pb-1 text-sm [--prompt-area-placeholder:color-mix(in_oklch,var(--color-base-content)_35%,transparent)]"
            aria-label="Ask the dashboard assistant"
            data-test-id="dashboard-assistant-input"
          />
          <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5">
            <div className="flex min-w-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground"
                aria-label="Attach context"
                onClick={() => setAttachOpen(true)}
                data-test="dashboard-assistant-attach"
              >
                <Plus className="size-4" />
              </Button>
              <button
                type="button"
                onClick={onOpenSettings}
                title="Change model"
                className="flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                data-test="dashboard-assistant-model-selector"
              >
                <span className="truncate font-medium">{activeModelLabel ?? "Default model"}</span>
                {activeRoutingLabel ? (
                  <span className="truncate opacity-70">· {activeRoutingLabel}</span>
                ) : null}
              </button>
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
                  data-test="dashboard-assistant-stop"
                >
                  <Square className="size-3.5" />
                </Button>
              ) : null}
              <Button
                type="submit"
                size="icon-sm"
                aria-label="Send message"
                disabled={!canSend || !hasText(segments) || isBusy}
                data-test="dashboard-assistant-send"
              >
                <ArrowUp className="size-4" />
              </Button>
            </div>
          </div>
        </form>
        {apiKey || lastCompaction ? (
          <div className="flex items-center justify-between gap-2 px-1">
            {apiKey ? (
              <div data-test="dashboard-assistant-credits">
                <CreditsDisplay
                  apiKey={apiKey}
                  sessionChars={sessionChars}
                  onOpenSettings={onOpenSettings}
                />
              </div>
            ) : null}
            {lastCompaction ? <ContextCompactionBadge compaction={lastCompaction} /> : null}
          </div>
        ) : null}
      </div>
      <ResumeAiAttachSheet
        open={attachOpen}
        onOpenChange={setAttachOpen}
        activeResumeId={null}
        attachedIds={attachedIds}
        onAttach={(item) => {
          composerRef.current?.insertChip(attachChip(item));
          composerRef.current?.focus();
        }}
      />
    </div>
  );
}
