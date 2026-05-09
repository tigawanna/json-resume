import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AiSettingsPanel } from "@/features/agentic-tools/AiSettingsPanel";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { Bot, LoaderCircle, Search, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";

interface ResumeAiTabProps {
  resumeId: string;
  jobDescription: string;
}

export function ResumeAiTab({ resumeId, jobDescription }: ResumeAiTabProps) {
  const [input, setInput] = useState("");
  const { settings, saveSettings, clearSettings } = useAiSettings();

  const { messages, sendMessage, clear, isLoading, error } = useChat({
    connection: fetchServerSentEvents("/api/ai/resume-tailor"),
    body: {
      resumeId,
      jobDescription,
      apiKey: settings?.apiKey ?? "",
      model: settings?.model ?? "",
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isLoading || !settings) {
      return;
    }

    await sendMessage(trimmed);
    setInput("");
  }

  async function sendStarter(message: string) {
    if (isLoading || !settings) {
      return;
    }

    await sendMessage(message);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4" data-test="resume-ai-tab">
      <AiSettingsPanel settings={settings} onSave={saveSettings} onClear={clearSettings} />

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
            disabled={!jobDescription.trim() || isLoading || !settings}
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
            disabled={isLoading || !settings}
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
            disabled={isLoading || !settings}
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
                {settings
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
                settings
                  ? "Ask for a fit analysis, a rewritten summary, better bullets, or a tailored draft..."
                  : "Configure your API key above to start chatting..."
              }
              rows={4}
              disabled={isLoading || !settings}
              data-test="resume-ai-input"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                The assistant can inspect the current resume and reuse existing blocks. It should
                not invent experience.
              </p>
              <Button
                type="submit"
                disabled={!input.trim() || isLoading || !settings}
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
