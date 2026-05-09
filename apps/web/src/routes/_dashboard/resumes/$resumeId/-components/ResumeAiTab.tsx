import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AiSettingsPanel } from "@/features/agentic-tools/AiSettingsPanel";
import { AiProviderModal } from "@/features/agentic-tools/AiProviderModal";
import { useAiSettings } from "@/hooks/use-ai-settings";
import {
  useOpenRouterCredits,
  openRouterCreditsQueryOptions,
} from "@/hooks/use-openrouter-credits";
import { cn } from "@/lib/utils";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  Bot,
  Coins,
  ChevronsUpDown,
  FileSearch,
  Hash,
  LoaderCircle,
  MessageSquareText,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";

interface ResumeAiTabProps {
  resumeId: string;
  jobDescription: string;
}

const isLocalMode = import.meta.env.VITE_AI_LOCAL_MODE === "true";

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

interface CreditsDisplayProps {
  apiKey: string;
  sessionChars: number;
}

function CreditsDisplay({ apiKey, sessionChars }: CreditsDisplayProps) {
  const { data, isLoading, isError, error } = useOpenRouterCredits(apiKey);

  if (isLoading) return <span className="text-xs text-muted-foreground">Checking credits…</span>;

  if (isError) {
    const message = error instanceof Error ? error.message : "Failed to load credits";
    return <span className="text-xs text-destructive">{message}</span>;
  }

  if (!data) return null;

  const remaining = data.remaining_credits_display ?? data.total_credits - data.total_usage;

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <Coins className="size-3" />
      <span>{formatCreditAmount(remaining)} remaining</span>
      {sessionChars > 0 && (
        <>
          <span className="text-primary/30">·</span>
          <Hash className="size-3" />
          <span>{formatTokenCount(sessionChars)} tokens this session</span>
        </>
      )}
    </span>
  );
}

function ChatAvatar({ role }: { role: "assistant" | "user" }) {
  const isAssistant = role === "assistant";

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full ring-1",
        isAssistant
          ? "bg-[color-mix(in_oklch,var(--color-primary)_18%,var(--color-base-200))] text-primary ring-[color-mix(in_oklch,var(--color-primary)_32%,transparent)]"
          : "bg-primary text-primary-foreground ring-[color-mix(in_oklch,var(--color-primary)_42%,transparent)]",
      )}
      aria-hidden="true"
    >
      {isAssistant ? <Sparkles className="size-4" /> : <MessageSquareText className="size-4" />}
    </div>
  );
}

function ChatText({ content, role }: { content: string; role: "assistant" | "user" }) {
  const nodes: ReactNode[] = [];
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const key = `${index}-${trimmed.slice(0, 20)}`;

    if (!trimmed) {
      nodes.push(<div key={key} className="h-1" />);
      return;
    }

    if (trimmed === "---") {
      nodes.push(
        <div
          key={key}
          className="my-3 h-px bg-[color-mix(in_oklch,currentColor_18%,transparent)]"
        />,
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h4 key={key} className="pt-2 text-sm font-semibold">
          {trimmed.slice(4)}
        </h4>,
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h3 key={key} className="pt-2 text-base font-semibold">
          {trimmed.slice(3)}
        </h3>,
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      nodes.push(
        <h2 key={key} className="pt-2 text-base font-semibold">
          {trimmed.slice(2)}
        </h2>,
      );
      return;
    }

    if (trimmed.startsWith(">")) {
      nodes.push(
        <blockquote
          key={key}
          className="rounded-md border-l-2 border-[color-mix(in_oklch,currentColor_42%,transparent)] bg-[color-mix(in_oklch,currentColor_7%,transparent)] px-3 py-2"
        >
          {trimmed.replace(/^>\s?/, "")}
        </blockquote>,
      );
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      nodes.push(
        <div key={key} className="grid grid-cols-[0.75rem_1fr] gap-2">
          <span className="mt-[0.6rem] size-1.5 rounded-full bg-current opacity-45" />
          <span>{trimmed.replace(/^[-*]\s+/, "")}</span>
        </div>,
      );
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const marker = trimmed.match(/^\d+\./)?.[0] ?? "";
      nodes.push(
        <div key={key} className="grid grid-cols-[1.5rem_1fr] gap-2">
          <span className="text-xs font-semibold opacity-55">{marker}</span>
          <span>{trimmed.replace(/^\d+\.\s+/, "")}</span>
        </div>,
      );
      return;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      nodes.push(
        <pre
          key={key}
          className="overflow-x-auto rounded-md bg-[color-mix(in_oklch,var(--color-base-content)_8%,transparent)] px-3 py-2 text-xs"
        >
          {trimmed}
        </pre>,
      );
      return;
    }

    nodes.push(
      <p key={key} className="whitespace-pre-wrap">
        {trimmed}
      </p>,
    );
  });

  return (
    <div
      className={cn(
        "space-y-1.5 text-sm leading-6",
        role === "user" ? "text-primary-foreground" : "text-foreground",
      )}
    >
      {nodes}
    </div>
  );
}

export function ResumeAiTab({ resumeId, jobDescription }: ResumeAiTabProps) {
  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, saveSettings, clearSettings } = useAiSettings();
  const queryClient = useQueryClient();
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const isReady = isLocalMode || !!settings;

  const { messages, sendMessage, clear, isLoading, error } = useChat({
    connection: fetchServerSentEvents("/api/ai/resume-tailor"),
    body: {
      resumeId,
      jobDescription,
      apiKey: settings?.apiKey,
      model: settings?.model,
    },
  });

  const wasLoading = useRef(false);
  useEffect(() => {
    if (wasLoading.current && !isLoading && settings?.apiKey) {
      void queryClient.invalidateQueries({
        queryKey: openRouterCreditsQueryOptions(settings.apiKey).queryKey,
      });
    }
    wasLoading.current = isLoading;
  }, [isLoading, settings?.apiKey, queryClient]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isLoading]);

  async function submitMessage() {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !isReady) return;
    await sendMessage(trimmed);
    setInput("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submitMessage();
  }

  async function sendStarter(message: string) {
    if (isLoading || !isReady) return;
    await sendMessage(message);
  }

  const activeModelLabel = settings?.model
    ? (settings.model.split("/").pop() ?? settings.model)
    : null;

  const sessionChars = useMemo(
    () =>
      messages.reduce((total, msg) => {
        const textChars = msg.parts
          .filter((p) => p.type === "text")
          .reduce((sum, p) => sum + (p.type === "text" ? p.content.length : 0), 0);
        return total + textChars;
      }, 0),
    [messages],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4" data-test="resume-ai-tab">
      {isLocalMode ? (
        <div className="flex items-center gap-2 rounded-xl bg-[color-mix(in_oklch,var(--color-base-200)_84%,var(--color-primary)_16%)] px-4 py-2.5 text-sm text-muted-foreground ring-1 ring-[color-mix(in_oklch,var(--color-primary)_22%,transparent)]">
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
            Local mode
          </span>
          Using LM Studio — no API key required.
        </div>
      ) : (
        <>
          <AiSettingsPanel settings={settings} onOpenSettings={() => setSettingsOpen(true)} />
          <AiProviderModal
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            settings={settings}
            onSave={saveSettings}
            onClear={clearSettings}
          />
        </>
      )}

      <Card className="overflow-hidden border-0 bg-[color-mix(in_oklch,var(--color-base-200)_92%,var(--color-base-content)_8%)] shadow-[0_18px_55px_color-mix(in_oklch,var(--color-base-content)_8%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
        <CardHeader className="gap-3 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="size-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base">Resume AI Assistant</CardTitle>
                <CardDescription className="mt-1 max-w-3xl text-sm leading-6">
                  Ask for resume-fit analysis, sharper summaries, stronger bullets, or a tailored
                  draft. The assistant can inspect this resume and search reusable blocks in place.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_10%,transparent)] px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" />
              {isReady ? "Ready" : "Provider needed"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Button
            type="button"
            variant="ghost"
            disabled={!jobDescription.trim() || isLoading || !isReady}
            onClick={() =>
              sendStarter(
                "Use the saved job description and tell me how well this resume matches it, including the biggest gaps.",
              )
            }
            className="h-auto justify-start gap-3 rounded-xl bg-base-100/70 px-3 py-3 text-left shadow-none ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)] hover:bg-[color-mix(in_oklch,var(--color-primary)_10%,var(--color-base-100))]"
            data-test="resume-ai-starter-match"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--color-primary)_14%,transparent)] text-primary">
              <Search className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span>Analyze job fit</span>
              <span className="text-xs font-normal text-muted-foreground">Match gaps and wins</span>
            </span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isLoading || !isReady}
            onClick={() =>
              sendStarter(
                "Load the current resume and draft a sharper professional summary targeted at senior full-stack roles.",
              )
            }
            className="h-auto justify-start gap-3 rounded-xl bg-base-100/70 px-3 py-3 text-left shadow-none ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)] hover:bg-[color-mix(in_oklch,var(--color-primary)_10%,var(--color-base-100))]"
            data-test="resume-ai-starter-summary"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--color-info)_14%,transparent)] text-info">
              <Bot className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span>Rewrite summary</span>
              <span className="text-xs font-normal text-muted-foreground">
                Senior-positioned draft
              </span>
            </span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isLoading || !isReady}
            onClick={() =>
              sendStarter(
                "Load the current resume, search for the strongest relevant blocks, and propose a tailored draft plan before writing any JSON.",
              )
            }
            className="h-auto justify-start gap-3 rounded-xl bg-base-100/70 px-3 py-3 text-left shadow-none ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)] hover:bg-[color-mix(in_oklch,var(--color-primary)_10%,var(--color-base-100))]"
            data-test="resume-ai-starter-draft"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--color-accent)_18%,transparent)] text-accent-foreground">
              <WandSparkles className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span>Plan a tailored draft</span>
              <span className="text-xs font-normal text-muted-foreground">
                Find reusable blocks
              </span>
            </span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isLoading || messages.length === 0}
            onClick={clear}
            className="h-auto rounded-xl px-4 text-muted-foreground hover:text-foreground"
            data-test="resume-ai-clear"
          >
            Clear chat
          </Button>
        </CardContent>
      </Card>

      <Card className="min-h-120 overflow-hidden border-0 bg-[color-mix(in_oklch,var(--color-base-200)_86%,var(--color-base-content)_14%)] shadow-[0_24px_80px_color-mix(in_oklch,var(--color-base-content)_10%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
        <CardContent className="flex h-full flex-col gap-0 p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--color-primary)_14%,transparent)] text-primary">
                <FileSearch className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Conversation</p>
                <p className="text-xs text-muted-foreground">
                  {messages.length === 0
                    ? "No messages yet"
                    : `${messages.length} message${messages.length === 1 ? "" : "s"}`}
                </p>
              </div>
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_10%,transparent)] px-3 py-1 text-xs text-muted-foreground">
                <LoaderCircle className="size-3 animate-spin text-primary" />
                Thinking
              </div>
            ) : null}
          </div>

          <div className="flex min-h-96 flex-col gap-5 overflow-hidden px-4 py-5 sm:px-5">
            {messages.length === 0 ? (
              <div className="flex h-full flex-1 flex-col items-center justify-center rounded-2xl bg-base-100/55 px-6 py-12 text-center ring-1 ring-dashed ring-[color-mix(in_oklch,var(--color-base-content)_14%,transparent)]">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[color-mix(in_oklch,var(--color-primary)_13%,transparent)] text-primary">
                  <Sparkles className="size-5" />
                </div>
                <p className="text-sm font-medium">
                  {isReady ? "Start a resume tailoring chat" : "Connect an AI provider first"}
                </p>
                <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                  {isReady
                    ? "Choose a prompt above or ask for a specific edit, fit check, or rewrite."
                    : "Configure your OpenRouter API key above to unlock the assistant."}
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const role = message.role === "assistant" ? "assistant" : "user";

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-full items-start gap-3",
                      role === "user" && "flex-row-reverse",
                    )}
                  >
                    <ChatAvatar role={role} />
                    <div
                      className={cn(
                        "min-w-0 max-w-[min(44rem,calc(100%-3rem))] rounded-2xl px-4 py-3 shadow-sm ring-1",
                        role === "user"
                          ? "rounded-tr-md bg-primary text-primary-foreground ring-[color-mix(in_oklch,var(--color-primary)_34%,transparent)]"
                          : "rounded-tl-md bg-base-100 text-foreground ring-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)]",
                      )}
                    >
                      <p
                        className={cn(
                          "mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em]",
                          role === "user" ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {role === "assistant" ? "Assistant" : "You"}
                      </p>
                      <div className="flex flex-col gap-2">
                        {message.parts.map((part, index) => {
                          if (part.type === "text") {
                            return <ChatText key={index} content={part.content} role={role} />;
                          }
                          if (part.type === "thinking") {
                            return (
                              <details
                                key={index}
                                className="group rounded-lg bg-[color-mix(in_oklch,var(--color-primary)_8%,transparent)] px-3 py-2 text-xs text-muted-foreground"
                              >
                                <summary className="cursor-pointer list-none font-medium text-foreground/80 marker:hidden">
                                  Thinking
                                </summary>
                                <p className="mt-2 whitespace-pre-wrap leading-5">{part.content}</p>
                              </details>
                            );
                          }
                          if (part.type === "tool-call") {
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-2 rounded-lg bg-[color-mix(in_oklch,var(--color-base-content)_6%,transparent)] px-3 py-2 text-xs text-muted-foreground"
                              >
                                <span className="size-2 rounded-full bg-primary" />
                                Tool
                                <span className="font-medium text-foreground">{part.name}</span>
                              </div>
                            );
                          }
                          if (part.type === "tool-result") {
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-2 rounded-lg bg-[color-mix(in_oklch,var(--color-success)_10%,transparent)] px-3 py-2 text-xs text-muted-foreground"
                              >
                                <span className="size-2 rounded-full bg-success" />
                                Tool result received
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endOfMessagesRef} />
          </div>

          {error ? (
            <p
              className="mx-4 mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-5"
              data-test="resume-ai-error"
            >
              {error.message}
            </p>
          ) : null}

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 border-t border-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)] bg-base-100/55 p-4 sm:p-5"
          >
            <div className="rounded-2xl bg-base-200 shadow-inner ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={
                  isReady
                    ? "Ask for a fit analysis, a rewritten summary, better bullets, or a tailored draft..."
                    : "Configure your API key above to start chatting..."
                }
                rows={3}
                disabled={isLoading || !isReady}
                className="min-h-24 resize-none border-0 bg-transparent p-4 shadow-none focus-visible:ring-0"
                data-test="resume-ai-input"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {(activeModelLabel && !isLocalMode) || settings?.apiKey ? (
                <div className="flex flex-wrap items-center gap-2 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_7%,transparent)] px-2 py-1 ring-1 ring-[color-mix(in_oklch,var(--color-primary)_18%,transparent)]">
                  {activeModelLabel && !isLocalMode && (
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ChevronsUpDown className="size-3 text-primary/60" />
                      {activeModelLabel}
                    </button>
                  )}
                  {activeModelLabel && !isLocalMode && settings?.apiKey && (
                    <span className="text-primary/30">·</span>
                  )}
                  {settings?.apiKey && (
                    <CreditsDisplay apiKey={settings.apiKey} sessionChars={sessionChars} />
                  )}
                </div>
              ) : (
                <div />
              )}
              <Button
                type="submit"
                disabled={!input.trim() || isLoading || !isReady}
                className="min-w-32 rounded-xl"
                data-test="resume-ai-submit"
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                    Working...
                  </>
                ) : (
                  <>
                    Send
                    <ArrowUp className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
