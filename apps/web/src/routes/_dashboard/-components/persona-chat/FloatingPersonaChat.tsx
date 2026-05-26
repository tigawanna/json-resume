import { AiProviderModal } from "@/features/agentic-tools/AiProviderModal";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { cn } from "@/lib/utils";
import { resumeCollection } from "@/data-access-layer/resume/resumes-query-collection";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchServerSentEvents, useChat, type UIMessage } from "@tanstack/ai-react";
import { useQueryClient } from "@tanstack/react-query";
import { PERSONA_WRITER_OPEN_EVENT } from "./persona-chat-events";
import {
  Bot,
  Check,
  GripHorizontal,
  KeyRound,
  Minimize2,
  RefreshCcw,
  Send,
  Sparkles,
  Square,
  Trash2,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
} from "react";

const isLocalMode = import.meta.env.VITE_AI_LOCAL_MODE === "true";
const POSITION_STORAGE_KEY = "persona_writer_position_v2";
const DEFAULT_EDGE_OFFSET = 24;
const DEFAULT_BOTTOM_OFFSET = 104;
const createdResumeToolNames = new Set(["create_resume_from_document", "clone_resume"]);

type FloatingPosition = {
  x: number;
  y: number;
};

type DragState = {
  offsetX: number;
  offsetY: number;
};

type MessageRole = "assistant" | "user";

export function FloatingPersonaChat() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const handledToolOutputsRef = useRef(new Set<string>());
  const { settings, saveSettings, clearSettings } = useAiSettings();
  const queryClient = useQueryClient();
  const isReady = isLocalMode || !!settings;

  const chat = useChat({
    id: "persona-writer-chat",
    connection: fetchServerSentEvents("/api/ai/persona-writer"),
    body: {
      apiKey: settings?.apiKey,
      model: settings?.model,
    },
  });

  const { messages, isLoading, status, setMessages } = chat;
  const activeModelLabel = settings?.model
    ? (settings.model.split("/").pop() ?? settings.model)
    : null;

  useEffect(() => {
    const stored = readStoredPosition();
    if (stored) {
      setPosition(clampPosition(stored, getSurfaceSize(surfaceRef.current)));
      return;
    }

    setPosition(getDefaultPosition(open));
  }, []);

  useEffect(() => {
    if (!position) return;
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    const activeDrag = dragState;
    if (!activeDrag) return;
    const { offsetX, offsetY } = activeDrag;

    function handlePointerMove(event: globalThis.PointerEvent) {
      setPosition(
        clampPosition(
          {
            x: event.clientX - offsetX,
            y: event.clientY - offsetY,
          },
          getSurfaceSize(surfaceRef.current),
        ),
      );
    }

    function handlePointerUp() {
      setDragState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

  useEffect(() => {
    if (!open || messages.length === 0) return;
    const container = messagesScrollRef.current;
    const target = latestMessageRef.current;
    if (!container || !target) return;
    const containerTop = container.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    container.scrollTop += targetTop - containerTop;
  }, [messages.length, open]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    function handleOpenRequest() {
      openWriter();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || (!event.ctrlKey && !event.metaKey)) return;
      event.preventDefault();
      openWriter();
    }

    window.addEventListener(PERSONA_WRITER_OPEN_EVENT, handleOpenRequest);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(PERSONA_WRITER_OPEN_EVENT, handleOpenRequest);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [position]);

  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (part.type !== "tool-call" || !createdResumeToolNames.has(part.name)) continue;
        if (handledToolOutputsRef.current.has(part.id) || !hasResumeIdOutput(part.output)) {
          continue;
        }

        handledToolOutputsRef.current.add(part.id);
        void queryClient.invalidateQueries({ queryKey: ["resumes"] });
        void resumeCollection.utils.refetch();
      }
    }
  }, [messages, queryClient]);

  async function submitMessage() {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !isReady) return;
    await chat.sendMessage(trimmed);
    setInput("");
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage();
  }

  function startDrag(event: PointerEvent<HTMLElement>) {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    setDragState({
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    window.setTimeout(() => {
      const nextPosition = position ?? getDefaultPosition(nextOpen);
      setPosition(clampPosition(nextPosition, getSurfaceSize(surfaceRef.current)));
    }, 0);
  }

  function openWriter() {
    handleOpenChange(true);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }

  function sendStarter(message: string) {
    if (isLoading || !isReady) return;
    setOpen(true);
    void chat.sendMessage(message);
  }

  function clearConversation() {
    chat.clear();
    setMessages([]);
    handledToolOutputsRef.current.clear();
  }

  const surfaceStyle = getSurfaceStyle(position);

  return (
    <>
      <div ref={surfaceRef} className="fixed z-50" style={surfaceStyle} data-test="persona-writer">
        {open ? (
          <section className="flex h-[80vh] max-h-[80vh] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-[color-mix(in_oklch,var(--color-base-content)_12%,transparent)] bg-base-100 text-base-content shadow-[0_24px_80px_color-mix(in_oklch,var(--color-base-content)_22%,transparent)]">
            <header className="flex shrink-0 items-center gap-2 border-b border-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)] bg-base-200 px-3 py-2.5">
              <button
                type="button"
                onPointerDown={startDrag}
                className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted-foreground hover:bg-base-300 hover:text-foreground active:cursor-grabbing"
                aria-label="Move Persona Writer"
                data-test="persona-writer-drag"
              >
                <GripHorizontal className="size-4" />
              </button>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <WandSparkles className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Persona Writer</p>
                <p className="truncate text-xs text-muted-foreground">
                  {isReady
                    ? activeModelLabel
                      ? `Using ${activeModelLabel}`
                      : "Ready"
                    : "Connect an AI provider"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg"
                onClick={() => setSettingsOpen(true)}
                data-test="persona-writer-settings"
                title="AI settings"
              >
                <KeyRound className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg"
                onClick={() => handleOpenChange(false)}
                data-test="persona-writer-minimize"
                title="Minimize"
              >
                <Minimize2 className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg"
                onClick={() => handleOpenChange(false)}
                data-test="persona-writer-close"
                title="Close"
              >
                <X className="size-4" />
              </Button>
            </header>

            <div className="shrink-0 border-b border-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)] bg-base-100 px-3 py-2">
              <div className="grid grid-cols-2 gap-2">
                {starterPrompts.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => sendStarter(starter.prompt)}
                    disabled={!isReady || isLoading}
                    className="min-h-10 rounded-lg bg-base-200 px-2.5 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--color-primary)_10%,var(--color-base-200))] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-55"
                    data-test={starter.dataTest}
                  >
                    {starter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              <div
                ref={messagesScrollRef}
                className="absolute inset-0 overflow-y-auto overscroll-contain"
              >
                <div className="flex flex-col gap-4 p-3">
                  {messages.length === 0 ? <EmptyPersonaConversation isReady={isReady} /> : null}
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      ref={index === messages.length - 1 ? latestMessageRef : undefined}
                    >
                      <PersonaMessage message={message} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="shrink-0 border-t border-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)] bg-base-200/80 p-3"
            >
              {chat.error ? (
                <p
                  className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
                  data-test="persona-writer-error"
                >
                  {chat.error.message}
                </p>
              ) : null}
              <Textarea
                ref={composerRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                    return;
                  }
                  event.preventDefault();
                  void submitMessage();
                }}
                placeholder={
                  isReady
                    ? "Ask for a proposal, cover letter, DM, bio, or new resume..."
                    : "Configure your API key to start..."
                }
                rows={3}
                disabled={isLoading || !isReady}
                className="field-sizing-fixed max-h-32 min-h-20 resize-none overflow-y-auto border-0 bg-base-100 shadow-none focus-visible:ring-primary/35"
                data-test="persona-writer-input"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {status === "ready" ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  <span>{getStatusLabel(status, isLoading)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg"
                    onClick={clearConversation}
                    disabled={messages.length === 0 || isLoading}
                    data-test="persona-writer-clear"
                    title="Clear chat"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  {isLoading ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg"
                      onClick={chat.stop}
                      data-test="persona-writer-stop"
                      title="Stop"
                    >
                      <Square className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg"
                      onClick={chat.reload}
                      disabled={messages.length === 0 || !isReady}
                      data-test="persona-writer-reload"
                      title="Regenerate"
                    >
                      <RefreshCcw className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    type="submit"
                    size="icon"
                    className="size-8 rounded-lg"
                    disabled={!input.trim() || isLoading || !isReady}
                    data-test="persona-writer-send"
                    title="Send"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </form>
          </section>
        ) : (
          <button
            type="button"
            onClick={() => handleOpenChange(true)}
            onPointerDown={startDrag}
            className="group flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_18px_48px_color-mix(in_oklch,var(--color-primary)_32%,transparent)] ring-1 ring-primary/30 transition-transform hover:scale-105"
            data-test="persona-writer-launcher"
            aria-label="Open Persona Writer"
          >
            <WandSparkles className="size-6 transition-transform group-hover:rotate-6" />
          </button>
        )}
      </div>
      <AiProviderModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSave={saveSettings}
        onClear={clearSettings}
      />
    </>
  );
}

function EmptyPersonaConversation({ isReady }: { isReady: boolean }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-[color-mix(in_oklch,var(--color-base-content)_16%,transparent)] bg-base-200/55 px-5 py-8 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--color-primary)_14%,transparent)] text-primary">
        <Bot className="size-5" />
      </div>
      <p className="text-sm font-semibold">
        {isReady ? "Ask from your whole persona" : "Connect AI first"}
      </p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {isReady
          ? "Draft proposals, cover letters, DMs, bios, or new resumes using all saved resume data."
          : "Add an OpenRouter key, or use local mode with LM Studio."}
      </p>
    </div>
  );
}

function PersonaMessage({ message }: { message: UIMessage }) {
  const role: MessageRole = message.role === "assistant" ? "assistant" : "user";

  return (
    <div className={cn("flex items-start gap-2", role === "user" && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          role === "assistant" ? "bg-base-200 text-primary" : "bg-primary text-primary-foreground",
        )}
      >
        {role === "assistant" ? <Sparkles className="size-4" /> : <UserRound className="size-4" />}
      </div>
      <div
        className={cn(
          "min-w-0 max-w-[calc(100%-2.5rem)] rounded-xl px-3 py-2.5 text-sm shadow-sm ring-1",
          role === "assistant"
            ? "rounded-tl-sm bg-base-100 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]"
            : "rounded-tr-sm bg-primary text-primary-foreground ring-primary/30",
        )}
      >
        <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-normal opacity-65">
          {role === "assistant" ? "Persona Writer" : "You"}
        </div>
        <div className="flex flex-col gap-2">
          {message.parts.map((part, index) => {
            if (part.type === "text") {
              return (
                <div key={index} className="break-words whitespace-pre-wrap leading-6">
                  {part.content}
                </div>
              );
            }

            if (part.type === "tool-call") {
              return <ToolCallBadge key={index} name={part.name} state={part.state} />;
            }

            if (part.type === "tool-result") {
              return <ToolResultBadge key={index} state={part.state} error={part.error} />;
            }

            if (part.type === "thinking") {
              return (
                <div
                  key={index}
                  className="rounded-lg bg-base-200 px-2.5 py-2 text-xs text-muted-foreground"
                >
                  Thinking...
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}

function ToolCallBadge({ name, state }: { name: string; state: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-base-200 px-2.5 py-2 text-xs text-muted-foreground">
      <Sparkles className="size-3.5 text-primary" />
      <span className="truncate">{formatToolName(name)}</span>
      <span className="ml-auto shrink-0">{state}</span>
    </div>
  );
}

function ToolResultBadge({ state, error }: { state: string; error?: string }) {
  return (
    <div className="rounded-lg bg-base-200 px-2.5 py-2 text-xs text-muted-foreground">
      {error ? `Tool failed: ${error}` : `Tool result: ${state}`}
    </div>
  );
}

const starterPrompts = [
  {
    label: "Freelance proposal",
    prompt:
      "Write a concise freelance proposal from my saved resume data. Ask for the project post if you need it.",
    dataTest: "persona-writer-starter-proposal",
  },
  {
    label: "Cover email",
    prompt:
      "Create a cover email from my persona data. Include a subject line and keep it ready to paste.",
    dataTest: "persona-writer-starter-email",
  },
  {
    label: "Social DM",
    prompt:
      "Draft a short, warm DM from my background. Ask me for the recipient and goal if needed.",
    dataTest: "persona-writer-starter-dm",
  },
  {
    label: "New resume",
    prompt:
      "Help me create a new targeted resume from my existing resumes. Start by finding the strongest relevant source material.",
    dataTest: "persona-writer-starter-resume",
  },
] satisfies Array<{ label: string; prompt: string; dataTest: string }>;

function getStatusLabel(status: string, isLoading: boolean): string {
  if (isLoading) return "Working";
  if (status === "ready") return "Ready";
  return status;
}

function getSurfaceStyle(position: FloatingPosition | null): CSSProperties {
  if (!position) return { right: `${DEFAULT_EDGE_OFFSET}px`, bottom: `${DEFAULT_BOTTOM_OFFSET}px` };
  return { left: `${position.x}px`, top: `${position.y}px` };
}

function readStoredPosition(): FloatingPosition | null {
  try {
    const raw = localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isFloatingPosition(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isFloatingPosition(value: unknown): value is FloatingPosition {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.x === "number" && typeof record.y === "number";
}

function getDefaultPosition(open: boolean): FloatingPosition {
  const width = open ? 416 : 56;
  const height = open ? 640 : 56;
  return clampPosition(
    {
      x: window.innerWidth - width - DEFAULT_EDGE_OFFSET,
      y: window.innerHeight - height - DEFAULT_BOTTOM_OFFSET,
    },
    { width, height },
  );
}

function getSurfaceSize(element: HTMLElement | null): { width: number; height: number } {
  const rect = element?.getBoundingClientRect();
  return {
    width: rect?.width ?? 416,
    height: rect?.height ?? 640,
  };
}

function clampPosition(
  position: FloatingPosition,
  size: { width: number; height: number },
): FloatingPosition {
  const padding = 16;
  return {
    x: clamp(position.x, padding, Math.max(padding, window.innerWidth - size.width - padding)),
    y: clamp(position.y, padding, Math.max(padding, window.innerHeight - size.height - padding)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatToolName(name: string): string {
  return name
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function hasResumeIdOutput(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.resumeId === "string";
}
