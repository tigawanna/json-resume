import { DotsPulse } from "@/components/loaders/DotsPulse";
import { PromptArea } from "@/components/prompt-area/prompt-area";
import type { PromptAreaHandle, Segment } from "@/components/prompt-area/types";
import { Button } from "@/components/ui/button";
import { CreditsDisplay } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiCredits";
import {
  hasText,
  serializeSegments,
} from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-prompt";
import { ArrowUp, Square } from "lucide-react";
import { useState, type RefObject } from "react";
import { ChatErrorNotice } from "../ChatErrorNotice";
import { AssistantFace } from "./AssistantFace";
import type { DashboardAssistantChat } from "./dashboard-assistant-chat-options";
import { DashboardAssistantChatUI } from "./dashboard-assistant-chat-ui";

const JOB_PROMPT = "Find the best résumé to start from for this job:\n\n";

/** `send: false` puts the prompt in the composer for the user to finish. */
type Suggestion = { label: string; prompt: string; send: boolean };

const SUGGESTIONS: Suggestion[] = [
  { label: "Find a résumé for a job", prompt: JOB_PROMPT, send: false },
  { label: "How is my job search going?", prompt: "How is my job search going?", send: true },
  {
    label: "What kind of developer am I?",
    prompt: "Based on my library, what kind of developer am I and what are my strongest skills?",
    send: true,
  },
  {
    label: "Compare my résumés",
    prompt: "Give me an overview of my résumés: what each one targets and how they differ.",
    send: true,
  },
];

interface DashboardAssistantConversationProps {
  activeModelLabel: string | null;
  activeRoutingLabel: string | null;
  apiKey: string | null;
  /** A tool approval is pending; sending declines it. */
  awaitingApproval: boolean;
  chat: DashboardAssistantChat;
  composerRef: RefObject<PromptAreaHandle | null>;
  endOfMessagesRef: RefObject<HTMLDivElement | null>;
  errorMessage: string | null;
  isBusy: boolean;
  sessionChars: number;
  sessionGenerating: boolean;
  onSend: (text: string) => void | Promise<void>;
  onRetry: () => void | Promise<void>;
  onStop: () => void;
  onEscape: () => void;
  onOpenSettings: () => void;
}

export function DashboardAssistantConversation({
  activeModelLabel,
  activeRoutingLabel,
  apiKey,
  awaitingApproval,
  chat,
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
}: DashboardAssistantConversationProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const isEmpty = chat.messages.length === 0;
  const isWorking = isBusy || sessionGenerating;

  function handleSend(nextSegments: Segment[]) {
    const message = serializeSegments(nextSegments);
    if (!message || isBusy) return;
    setSegments([]);
    void onSend(message);
  }

  function pickSuggestion(suggestion: Suggestion) {
    if (suggestion.send) {
      void onSend(suggestion.prompt);
      return;
    }
    composerRef.current?.setText(suggestion.prompt);
    composerRef.current?.focus();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-test="dashboard-assistant-conversation">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
            data-test="dashboard-assistant-intro"
          >
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <AssistantFace className="size-10" />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-base font-semibold">Hi! Not sure where to start?</p>
              <p className="text-sm text-muted-foreground text-pretty">
                Paste a job description and I will pick the best résumé to start from, then hand you
                over to the editor. Or ask me about your applications.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => pickSuggestion(suggestion)}
                  className="rounded-full border border-border bg-base-200/50 px-3 py-1.5 text-xs text-base-content/75 transition-colors hover:bg-base-200 hover:text-base-content"
                  data-test="dashboard-assistant-suggestion"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <DashboardAssistantChatUI.Provider chat={chat}>
            <DashboardAssistantChatUI.Messages>
              {(messages) =>
                messages.map((message) => (
                  <DashboardAssistantChatUI.Message key={message.id} message={message} />
                ))
              }
            </DashboardAssistantChatUI.Messages>
          </DashboardAssistantChatUI.Provider>
        )}
        {isWorking ? (
          <div className="shrink-0 py-1" data-test="dashboard-assistant-working">
            <DotsPulse label="Assistant is working" />
          </div>
        ) : null}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="flex shrink-0 flex-col gap-1.5 border-t border-border/60 p-3">
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
            handleSend(segments);
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
            placeholder={
              awaitingApproval
                ? "Pick an option above, or reply here to decline it..."
                : isEmpty
                  ? "Paste a job description or ask a question..."
                  : "Ask a follow-up..."
            }
            disabled={isBusy}
            markdown
            normalizeBullets={false}
            minHeight={24}
            maxHeight={200}
            className="px-3 pt-2.5 pb-1 text-sm [--prompt-area-placeholder:color-mix(in_oklch,var(--color-base-content)_35%,transparent)]"
            aria-label="Ask the dashboard assistant"
            data-test-id="dashboard-assistant-input"
          />
          <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5">
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
                disabled={!hasText(segments) || isBusy}
                data-test="dashboard-assistant-send"
              >
                <ArrowUp className="size-4" />
              </Button>
            </div>
          </div>
        </form>
        {apiKey ? (
          <div className="px-1" data-test="dashboard-assistant-credits">
            <CreditsDisplay
              apiKey={apiKey}
              sessionChars={sessionChars}
              onOpenSettings={onOpenSettings}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
