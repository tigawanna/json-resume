import { useEffect, useRef, useState } from "react";
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
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Coins,
  ChevronsUpDown,
  LoaderCircle,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";

interface ResumeAiTabProps {
  resumeId: string;
  jobDescription: string;
}

const isLocalMode = import.meta.env.VITE_AI_LOCAL_MODE === "true";

function CreditsDisplay({ apiKey }: { apiKey: string }) {
  const { data, isLoading, isError, error } = useOpenRouterCredits(apiKey);

  if (isLoading) return <span className="text-xs text-muted-foreground">Checking credits…</span>;

  if (isError) {
    const message = error instanceof Error ? error.message : "Failed to load credits";
    return <span className="text-xs text-destructive">{message}</span>;
  }

  if (!data) return null;

  const remaining = data.remaining_credits_display ?? data.total_credits - data.total_usage;
  const formatted = remaining.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Coins className="size-3" />
      {formatted} remaining
    </span>
  );
}

export function ResumeAiTab({ resumeId, jobDescription }: ResumeAiTabProps) {
  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, saveSettings, clearSettings } = useAiSettings();
  const queryClient = useQueryClient();

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || !isReady) return;
    await sendMessage(trimmed);
    setInput("");
  }

  async function sendStarter(message: string) {
    if (isLoading || !isReady) return;
    await sendMessage(message);
  }

  const activeModelLabel = settings?.model
    ? (settings.model.split("/").pop() ?? settings.model)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4" data-test="resume-ai-tab">
      {isLocalMode ? (
        <div className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm text-muted-foreground">
          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" />
            Resume AI Assistant
          </CardTitle>
          <CardDescription>
            Ask for resume-fit analysis, better summaries, stronger bullets, or a tailored draft.
            The assistant can inspect your current resume and search reusable blocks without leaving
            this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!jobDescription.trim() || isLoading || !isReady}
            onClick={() =>
              sendStarter(
                "Use the saved job description and tell me how well this resume matches it, including the biggest gaps.",
              )
            }
            data-test="resume-ai-starter-match"
          >
            <Search className="mr-2 size-4" />
            Analyze job fit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading || !isReady}
            onClick={() =>
              sendStarter(
                "Load the current resume and draft a sharper professional summary targeted at senior full-stack roles.",
              )
            }
            data-test="resume-ai-starter-summary"
          >
            <Bot className="mr-2 size-4" />
            Rewrite summary
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading || !isReady}
            onClick={() =>
              sendStarter(
                "Load the current resume, search for the strongest relevant blocks, and propose a tailored draft plan before writing any JSON.",
              )
            }
            data-test="resume-ai-starter-draft"
          >
            <WandSparkles className="mr-2 size-4" />
            Plan a tailored draft
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoading || messages.length === 0}
            onClick={clear}
            data-test="resume-ai-clear"
          >
            Clear chat
          </Button>
        </CardContent>
      </Card>

      <Card className="min-h-104">
        <CardContent className="flex h-full flex-col gap-4 p-4">
          <div className="flex min-h-72 flex-col gap-3">
            {messages.length === 0 ? (
              <div className="text-muted-foreground flex h-full flex-1 items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center text-sm">
                {isReady
                  ? "Start with one of the prompts above or ask for a specific tailoring task."
                  : "Configure your OpenRouter API key above to start chatting."}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-auto w-full max-w-3xl rounded-xl border bg-secondary/40 p-4"
                      : "mr-auto w-full max-w-3xl rounded-xl border bg-background p-4"
                  }
                >
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {message.role === "assistant" ? "Assistant" : "You"}
                  </p>
                  <div className="flex flex-col gap-2 text-sm">
                    {message.parts.map((part, index) => {
                      if (part.type === "text") {
                        return (
                          <p key={index} className="whitespace-pre-wrap leading-6">
                            {part.content}
                          </p>
                        );
                      }
                      if (part.type === "thinking") {
                        return (
                          <p key={index} className="text-xs italic text-muted-foreground">
                            Thinking: {part.content}
                          </p>
                        );
                      }
                      if (part.type === "tool-call") {
                        return (
                          <div
                            key={index}
                            className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                          >
                            Tool: <span className="font-medium text-foreground">{part.name}</span>
                          </div>
                        );
                      }
                      if (part.type === "tool-result") {
                        return (
                          <div
                            key={index}
                            className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                          >
                            Tool result received
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {error ? (
            <p className="text-destructive text-sm" data-test="resume-ai-error">
              {error.message}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t pt-4">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                isReady
                  ? "Ask for a fit analysis, a rewritten summary, better bullets, or a tailored draft..."
                  : "Configure your API key above to start chatting..."
              }
              rows={4}
              disabled={isLoading || !isReady}
              data-test="resume-ai-input"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                {activeModelLabel && !isLocalMode ? (
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronsUpDown className="size-3" />
                    {activeModelLabel}
                  </button>
                ) : null}
                {settings?.apiKey && <CreditsDisplay apiKey={settings.apiKey} />}
              </div>
              <Button
                type="submit"
                disabled={!input.trim() || isLoading || !isReady}
                className="min-w-32"
                data-test="resume-ai-submit"
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                    Working...
                  </>
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
