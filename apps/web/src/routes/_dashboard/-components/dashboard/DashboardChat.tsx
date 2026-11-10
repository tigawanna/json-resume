import { PromptArea } from "@/components/prompt-area/prompt-area";
import type { PromptAreaHandle, Segment } from "@/components/prompt-area/types";
import { useEventSourcedAiSettings } from "@/routes/_dashboard/-ai/-hooks/use-event-sourced-ai-settings";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { ArrowUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

export function DashboardChat() {
  const { settings } = useEventSourcedAiSettings();
  const isReady = !!settings;
  const composerRef = useRef<PromptAreaHandle>(null);
  const [segments, setSegments] = useState<Segment[]>([]);

  const chat = useChat({
    threadId: "dashboard-chat:local",
    connection: fetchServerSentEvents("/api/ai/dashboard-chat"),
    tools: [],
    forwardedProps: {
      apiKey: settings?.apiKey,
      model: settings?.model,
      routing: settings?.routing,
    },
  });

  const { messages, isLoading } = chat;

  function handleSend(next: Segment[]) {
    const text = next
      .map((segment) => (segment.type === "text" ? segment.text : segment.displayText))
      .join("")
      .trim();
    if (!text || !isReady) return;
    void chat.sendMessage(text);
    setSegments([]);
    composerRef.current?.focus();
  }

  return (
    <div className="flex max-h-160 w-full flex-col gap-4 rounded-2xl border border-base-content/15 bg-base-200/40 p-4">
      <div
        className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1"
        data-test="dashboard-chat-messages"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ask anything to get started.</p>
        ) : null}
        {messages.map((message) => {
          const isUser = message.role === "user";
          const text = (message.parts ?? [])
            .filter((part): part is { type: "text"; content: string } => part.type === "text")
            .map((part) => part.content)
            .join("");
          return (
            <div
              key={message.id}
              className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                  isUser
                    ? "bg-primary/10 ring-1 ring-[color-mix(in_oklch,var(--color-primary)_30%,transparent)]"
                    : "bg-base-100 ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)]",
                )}
              >
                {text}
              </div>
            </div>
          );
        })}
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Thinking...
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSend(segments);
        }}
        className="flex flex-col gap-2"
      >
        <div className="overflow-hidden rounded-2xl border border-base-content/15 bg-primary/10">
          <PromptArea
            ref={composerRef}
            value={segments}
            onChange={setSegments}
            onSubmit={handleSend}
            placeholder={
              isReady
                ? "Ask a question about your data or paste a target job description"
                : "Configure your API key in settings first"
            }
            disabled={!isReady}
            minHeight={26}
            maxHeight={160}
            className="px-4 pt-3 pb-1 text-base"
            aria-label="Dashboard chat"
            data-test-id="dashboard-chat-input"
          />
          <div className="flex justify-end px-2 pb-2">
            <Button type="submit" size="icon-sm" disabled={!isReady} aria-label="Send message">
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
