import { PromptArea } from "@/components/prompt-area/prompt-area";
import type { PromptAreaHandle, Segment } from "@/components/prompt-area/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { DashboardSheetBrand } from "./DashboardSheetBrand";
import { cn } from "@/lib/utils";
import { useEventSourcedAiSettings } from "@/routes/_dashboard/-ai/-hooks/use-event-sourced-ai-settings";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { ArrowUp, LoaderCircle, Sparkle } from "lucide-react";
import { Activity, useEffect, useRef, useState, type RefObject } from "react";

export function DashboardChat({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { settings } = useEventSourcedAiSettings();
  const isReady = !!settings;
  const placeholder = isReady
    ? "Ask a question about your data or paste a target job description"
    : "Configure your API key in settings first";

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="w-full max-w[70%] md:max-w-[50%]"
        data-test="dashboard-chat-trigger"
      >
        <div className="overflow-hidden rounded-2xl border border-base-content/15 bg-primary/10 flex items-center justify-between">
          <div className="px-4 py-3 text-base text-muted-foreground">{placeholder}</div>
          <Sparkle className="size-4 text-primary" />
        </div>
      </button>
      <Activity mode={open ? "visible" : "hidden"} name="dashboard-chat">
        <DashboardChatSheet open={open} onOpenChange={onOpenChange} />
      </Activity>
    </>
  );
}

function DashboardChatSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { settings } = useEventSourcedAiSettings();
  const isReady = !!settings;
  const composerRef = useRef<PromptAreaHandle>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const placeholder = isReady
    ? "Ask a question about your data or paste a target job description"
    : "Configure your API key in settings first";

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => composerRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        showCloseButton={false}
        className="inset-0 h-full w-full border-none p-0"
      >
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 p-6">
          <SheetHeader className="flex flex-row items-center justify-between gap-4 p-0">
            <DashboardSheetBrand title="Ask" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              aria-label="Close chat"
              data-test="dashboard-chat-close"
            >
              Done
            </Button>
          </SheetHeader>
          <ChatBody
            composerRef={composerRef}
            disabled={!isReady}
            isLoading={isLoading}
            messages={messages}
            placeholder={placeholder}
            segments={segments}
            onSegmentsChange={setSegments}
            onSend={handleSend}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ChatBody({
  composerRef,
  disabled,
  isLoading,
  messages,
  placeholder,
  segments,
  onSegmentsChange,
  onSend,
}: {
  composerRef: RefObject<PromptAreaHandle | null>;
  disabled: boolean;
  isLoading: boolean;
  messages: ReturnType<typeof useChat>["messages"];
  placeholder: string;
  segments: Segment[];
  onSegmentsChange: (segments: Segment[]) => void;
  onSend: (segments: Segment[]) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
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
          onSend(segments);
        }}
        className="flex flex-col gap-2"
      >
        <div className="overflow-hidden rounded-2xl border border-base-content/15 bg-primary/10">
          <PromptArea
            ref={composerRef}
            value={segments}
            onChange={onSegmentsChange}
            onSubmit={onSend}
            placeholder={placeholder}
            disabled={disabled}
            minHeight={26}
            maxHeight={160}
            className="px-4 pt-3 pb-1 text-base"
            aria-label="Dashboard chat"
            data-test-id="dashboard-chat-input"
          />
          <div className="flex justify-end px-2 pb-2">
            <Button type="submit" size="icon-sm" disabled={disabled} aria-label="Send message">
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
