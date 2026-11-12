import { PromptArea } from "@/components/prompt-area/prompt-area";
import type { Segment } from "@/components/prompt-area/types";
import { DotsPulse } from "@/components/loaders/DotsPulse";
import { Button } from "@/components/ui/button";
import type { ResumeExperience } from "@/data-access-layer/event-sourced/schemas";
import { ChatErrorNotice } from "@/routes/_dashboard/-ai/-components/ChatErrorNotice";
import { EventSourcedAiSettingsSheet } from "@/routes/_dashboard/-ai/-components/EventSourcedAiSettingsSheet";
import { chatMessagesEqual } from "@/routes/_dashboard/-ai/-utils/chat-message-equal";
import {
  hasText,
  serializeSegments,
} from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-prompt";
import { ArrowUp, ChevronDown, Sparkles, Square } from "lucide-react";
import { memo, useState } from "react";
import {
  HostedAiSignIn,
  useHostedAiSignedIn,
} from "@/routes/_dashboard/-ai/-components/HostedAiSignIn";
import { useExperienceAi } from "../../-hooks/use-experience-ai";
import { ExperienceAiChatUI } from "./experience-ai-chat-ui";

interface ExperienceAiPanelProps {
  /** Titles of the open company + period group, in display order. */
  titles: ResumeExperience[];
  /** Stable company + period key; scopes the stored conversation. */
  groupKey: string;
}

type Suggestion = { label: string; prompt: string };

const SUGGESTIONS: Suggestion[] = [
  {
    label: "Condense all titles",
    prompt:
      "Condense the bullets for this company and period. Pick the title that best represents the period as the canonical set, make its bullets complete and well formatted, then reuse those bullets for the other titles. Trim duplicates and weak standalone bullets, but merge their unique facts into stronger bullets so nothing is lost.",
  },
  {
    label: "Trim weak bullets",
    prompt:
      "Review every bullet in this period and trim the ones that are vague, repetitive, or too weak to stand alone. Merge their unique facts into stronger bullets instead of losing them, and keep each title to six bullets or fewer.",
  },
  {
    label: "Merge duplicates",
    prompt:
      "Find bullets across these titles that say the same thing in different words. Rewrite the best version once and reuse it everywhere it honestly applies, deleting the weaker duplicates.",
  },
];

type ExperienceMessage = Parameters<typeof ExperienceAiChatUI.Message>[0]["message"];

const StableExperienceMessage = memo(
  function StableExperienceMessage({ message }: { message: ExperienceMessage }) {
    return <ExperienceAiChatUI.Message message={message} />;
  },
  (prev, next) => chatMessagesEqual(prev.message, next.message),
);

/**
 * Docs-style entry point pinned to the bottom of the scroll area: a glowing
 * sparkle dock that expands into a sticky panel where the composer grows with
 * the text (up to ~40% of the viewport) and the conversation scrolls above it.
 */
export function ExperienceAiPanel({ titles, groupKey }: ExperienceAiPanelProps) {
  const signedIn = useHostedAiSignedIn();
  const ai = useExperienceAi({ titles, groupKey });
  const [open, setOpen] = useState(() => ai.messages.length > 0);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [maxComposerHeight] = useState(() => Math.round(window.innerHeight * 0.4));
  const isWorking = ai.isLoading || ai.sessionGenerating;
  const hasMessages = ai.messages.length > 0;

  function handleSend(nextSegments: Segment[]) {
    const message = serializeSegments(nextSegments);
    if (!message || !ai.isReady || ai.isLoading) return;
    setSegments([]);
    void ai.sendText(message);
    ai.composerRef.current?.focus();
  }

  function pickSuggestion(suggestion: Suggestion) {
    if (!ai.isReady || ai.isLoading) return;
    void ai.sendText(suggestion.prompt);
  }

  function expand() {
    setOpen(true);
    window.setTimeout(() => ai.composerRef.current?.focus(), 50);
  }

  if (!open) {
    return (
      <div className="sticky bottom-4 z-20 mt-auto w-full" data-test="experience-ai-dock">
        <button
          type="button"
          onClick={expand}
          data-test="experience-ai-open"
          aria-label="Ask the experience assistant"
          className="relative mx-auto flex size-12 items-center justify-center rounded-full border border-primary/35 bg-base-100 text-primary shadow-[0_0_24px_color-mix(in_oklch,var(--color-primary)_45%,transparent)] transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none active:scale-95"
        >
          <span
            aria-hidden
            className="absolute inset-0 animate-pulse rounded-full bg-primary/15 blur-[2px]"
          />
          <Sparkles className="relative size-5" aria-hidden />
          {hasMessages ? (
            <span
              className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-content"
              data-test="experience-ai-message-count"
            >
              {ai.messages.length}
            </span>
          ) : null}
        </button>
      </div>
    );
  }

  return (
    <div className="sticky bottom-4 z-20 mt-auto w-full" data-test="experience-ai-dock">
      <section
        data-test="experience-ai-panel"
        className="flex max-h-[calc(100dvh-7rem)] flex-col gap-2.5 overflow-hidden rounded-xl border border-border/70 bg-base-100 p-3 shadow-xl"
      >
        <header className="flex shrink-0 items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
            Experience assistant · edits this company and period only
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Collapse assistant"
            data-test="experience-ai-close"
            onClick={() => setOpen(false)}
          >
            <ChevronDown className="size-4" />
          </Button>
        </header>

        {!signedIn ? <HostedAiSignIn /> : null}
        {signedIn && ai.isReady ? (
          <>
            {hasMessages ? (
              <div
                className="flex min-h-0 max-h-[40dvh] grow shrink flex-col gap-3 overflow-y-auto px-1 py-1"
                data-test="experience-ai-messages"
              >
                <ExperienceAiChatUI.Provider chat={ai.chat}>
                  <ExperienceAiChatUI.Messages>
                    {(messages) =>
                      messages.map((message) => (
                        <StableExperienceMessage key={message.id} message={message} />
                      ))
                    }
                  </ExperienceAiChatUI.Messages>
                </ExperienceAiChatUI.Provider>
                <div ref={ai.endOfMessagesRef} />
              </div>
            ) : (
              <div
                className="flex shrink-0 flex-col gap-2.5 px-1 py-1.5"
                data-test="experience-ai-intro"
              >
                <p className="text-sm text-muted-foreground text-pretty">
                  Look at every title in this period and condense the bullets into one unified set,
                  or start with a nudge:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => pickSuggestion(suggestion)}
                      disabled={isWorking}
                      className="rounded-full border border-border bg-base-200/50 px-3 py-1.5 text-xs text-base-content/75 transition-colors hover:bg-base-200 hover:text-base-content disabled:opacity-50"
                      data-test="experience-ai-suggestion"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isWorking ? (
              <div className="shrink-0 py-0.5" data-test="experience-ai-working">
                <DotsPulse label="Assistant is working" />
              </div>
            ) : null}

            {ai.errorMessage && !ai.isLoading ? (
              <ChatErrorNotice
                message={ai.errorMessage}
                onRetry={() => void ai.retryLastRun()}
                onOpenSettings={() => setSettingsOpen(true)}
                retryDisabled={!ai.isReady}
              />
            ) : null}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSend(segments);
              }}
              className="shrink-0 overflow-hidden rounded-2xl border border-base-content/15 bg-primary/5"
              data-test="experience-ai-composer"
            >
              <PromptArea
                ref={ai.composerRef}
                value={segments}
                onChange={setSegments}
                onSubmit={handleSend}
                onEscape={() => setOpen(false)}
                placeholder={
                  hasMessages
                    ? "Ask a follow-up about these bullets…"
                    : "Ask AI to condense, trim, or reuse these bullets…"
                }
                disabled={ai.isLoading}
                markdown
                normalizeBullets={false}
                minHeight={24}
                maxHeight={maxComposerHeight}
                className="px-3 pt-2.5 pb-1 text-sm [--prompt-area-placeholder:color-mix(in_oklch,var(--color-base-content)_35%,transparent)]"
                aria-label="Ask the experience assistant"
                data-test-id="experience-ai-input"
              />
              <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  title="Change model"
                  className="flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  data-test="experience-ai-model"
                >
                  <span className="truncate font-medium">
                    {ai.activeModelLabel ?? "Default model"}
                  </span>
                  {ai.activeRoutingLabel ? (
                    <span className="truncate opacity-70">· {ai.activeRoutingLabel}</span>
                  ) : null}
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  {ai.isLoading ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      aria-label="Stop generating"
                      onClick={ai.stop}
                      data-test="experience-ai-stop"
                    >
                      <Square className="size-3.5" />
                    </Button>
                  ) : null}
                  <Button
                    type="submit"
                    size="icon-sm"
                    aria-label={ai.isLoading ? "Queue message" : "Send message"}
                    disabled={!hasText(segments) || !ai.isReady}
                    data-test="experience-ai-send"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </div>
              </div>
            </form>
          </>
        ) : null}
        {signedIn && !ai.isReady ? (
          <div
            className="flex shrink-0 flex-col items-start gap-2.5 px-1 py-1.5"
            data-test="experience-ai-setup"
          >
            <p className="text-sm text-muted-foreground text-pretty">
              Connect an OpenRouter key to let the assistant condense these bullets. Every assistant
              in the app uses the same model settings.
            </p>
            <Button type="button" size="sm" onClick={() => setSettingsOpen(true)}>
              <Sparkles className="mr-1.5 size-3.5" /> Set up AI
            </Button>
          </div>
        ) : null}

        <EventSourcedAiSettingsSheet
          open={settingsOpen}
          apiKeyRejected={ai.apiKeyRejected}
          onOpenChange={setSettingsOpen}
        />
      </section>
    </div>
  );
}
