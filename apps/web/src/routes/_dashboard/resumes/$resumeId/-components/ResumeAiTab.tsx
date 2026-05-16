import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  clearLocalResumeAiChat,
  persistLocalResumeAiChat,
  resumeAiChatCollection,
} from "@/data-access-layer/resume/ai-chat/ai-chat.collection";
import {
  clearResumeAiChat,
  saveResumeAiChat,
} from "@/data-access-layer/resume/ai-chat/ai-chat.functions";
import { resumeAiChatQueryOptions } from "@/data-access-layer/resume/ai-chat/ai-chat.query-options";
import type {
  JsonValue,
  ResumeAiChatDTO,
  ResumeAiChatMessage,
  ResumeAiChatMessagePart,
} from "@/data-access-layer/resume/ai-chat/ai-chat.types";
import { resumeDetailQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import {
  resumeCollection,
  resumesCollection,
} from "@/data-access-layer/resume/resumes-query-collection";
import { AiSettingsPanel } from "@/features/agentic-tools/AiSettingsPanel";
import { AiProviderModal } from "@/features/agentic-tools/AiProviderModal";
import { useAiSettings } from "@/hooks/use-ai-settings";
import {
  useOpenRouterCredits,
  openRouterCreditsQueryOptions,
} from "@/hooks/use-openrouter-credits";
import { cn } from "@/lib/utils";
import { unwrapUnknownError } from "@/utils/errors";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { fetchServerSentEvents, useChat, type UIMessage } from "@tanstack/ai-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowUp,
  Bot,
  Box,
  ChevronDown,
  Coins,
  ChevronsUpDown,
  ExternalLink,
  FileSearch,
  Hash,
  LoaderCircle,
  MessageSquareText,
  PencilLine,
  RefreshCcw,
  Search,
  Sparkles,
  Square,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

interface ResumeAiTabProps {
  resumeId: string;
  jobDescription: string;
}

const isLocalMode = import.meta.env.VITE_AI_LOCAL_MODE === "true";
const writeToolNames = new Set([
  "clone_current_resume",
  "create_resume_from_document",
  "update_current_resume_document",
]);
const createdResumeToolNames = new Set(["clone_current_resume", "create_resume_from_document"]);

interface ToolCallViewPart {
  id: string;
  name: string;
  arguments: string;
  state: string;
  output?: unknown;
}

interface ToolResultViewPart {
  toolCallId: string;
  content: string;
  state: string;
  error?: string;
}

interface CreatedResumeOutput {
  resumeId: string;
  name?: string;
}

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
  const used = data.total_usage;

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <Coins className="size-3" />
      <span>{formatCreditAmount(remaining)} remaining</span>
      <span className="text-primary/30">·</span>
      <span>{formatCreditAmount(used)} used</span>
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

function renderInlineMarkdown(text: string, role: "assistant" | "user", keyPrefix: string) {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let matchIndex = 0;

  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined) continue;
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-inline-${matchIndex}`;

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={key}
          className={cn(
            "rounded px-1.5 py-0.5 text-[0.82em]",
            role === "user"
              ? "bg-primary-foreground/15 text-primary-foreground"
              : "bg-[color-mix(in_oklch,var(--color-base-content)_8%,transparent)] text-foreground",
          )}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "font-medium underline underline-offset-2",
              role === "user" ? "text-primary-foreground" : "text-primary",
            )}
          >
            {linkMatch[1]}
          </a>,
        );
      }
    }

    lastIndex = match.index + token.length;
    matchIndex += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : text;
}

function ChatText({ content, role }: { content: string; role: "assistant" | "user" }) {
  const nodes: ReactNode[] = [];
  const lines = content.split("\n");
  let codeFence: { language: string; lines: string[] } | null = null;

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    const key = `${index}-${trimmed.slice(0, 20)}`;

    if (trimmed.startsWith("```")) {
      if (codeFence) {
        nodes.push(
          <pre
            key={`${key}-code`}
            className="my-2 max-w-full overflow-x-auto rounded-lg bg-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)] px-3 py-2 text-xs leading-5 text-foreground"
          >
            {codeFence.language && (
              <span className="mb-2 block text-[0.68rem] uppercase text-muted-foreground">
                {codeFence.language}
              </span>
            )}
            <code>{codeFence.lines.join("\n")}</code>
          </pre>,
        );
        codeFence = null;
      } else {
        codeFence = { language: trimmed.slice(3).trim(), lines: [] };
      }
      continue;
    }

    if (codeFence) {
      codeFence.lines.push(line);
      continue;
    }

    if (!trimmed) {
      nodes.push(<div key={key} className="h-1" />);
      continue;
    }

    if (trimmed === "---") {
      nodes.push(
        <div
          key={key}
          className="my-3 h-px bg-[color-mix(in_oklch,currentColor_18%,transparent)]"
        />,
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h4 key={key} className="pt-2 text-sm font-semibold">
          {renderInlineMarkdown(trimmed.slice(4), role, key)}
        </h4>,
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h3 key={key} className="pt-2 text-base font-semibold">
          {renderInlineMarkdown(trimmed.slice(3), role, key)}
        </h3>,
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      nodes.push(
        <h2 key={key} className="pt-2 text-base font-semibold">
          {renderInlineMarkdown(trimmed.slice(2), role, key)}
        </h2>,
      );
      continue;
    }

    if (trimmed.startsWith(">")) {
      nodes.push(
        <blockquote
          key={key}
          className="rounded-md border-l-2 border-[color-mix(in_oklch,currentColor_42%,transparent)] bg-[color-mix(in_oklch,currentColor_7%,transparent)] px-3 py-2"
        >
          {renderInlineMarkdown(trimmed.replace(/^>\s?/, ""), role, key)}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      nodes.push(
        <div key={key} className="grid grid-cols-[0.75rem_1fr] gap-2">
          <span className="mt-[0.6rem] size-1.5 rounded-full bg-current opacity-45" />
          <span>{renderInlineMarkdown(trimmed.replace(/^[-*]\s+/, ""), role, key)}</span>
        </div>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const marker = trimmed.match(/^\d+\./)?.[0] ?? "";
      nodes.push(
        <div key={key} className="grid grid-cols-[1.5rem_1fr] gap-2">
          <span className="text-xs font-semibold opacity-55">{marker}</span>
          <span>{renderInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ""), role, key)}</span>
        </div>,
      );
      continue;
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
      continue;
    }

    nodes.push(
      <p key={key} className="whitespace-pre-wrap">
        {renderInlineMarkdown(trimmed, role, key)}
      </p>,
    );
  }

  if (codeFence) {
    nodes.push(
      <pre
        key="open-code-fence"
        className="my-2 max-w-full overflow-x-auto rounded-lg bg-[color-mix(in_oklch,var(--color-base-content)_9%,transparent)] px-3 py-2 text-xs leading-5 text-foreground"
      >
        {codeFence.language && (
          <span className="mb-2 block text-[0.68rem] uppercase text-muted-foreground">
            {codeFence.language}
          </span>
        )}
        <code>{codeFence.lines.join("\n")}</code>
      </pre>,
    );
  }

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

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.content)
    .join("\n")
    .trim();
}

function getChatStatusLabel(status: string, isLoading: boolean, sessionGenerating: boolean) {
  if (status === "submitted") return "Request sent";
  if (status === "streaming") return "Streaming response";
  if (sessionGenerating) return "Generating";
  if (isLoading) return "Working";
  if (status === "error") return "Needs attention";
  return "Ready";
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const items: JsonValue[] = [];
    for (const item of value) {
      const parsed = toJsonValue(item);
      if (parsed !== undefined) items.push(parsed);
    }
    return items;
  }

  if (typeof value === "object") {
    const record: { [key: string]: JsonValue } = {};
    for (const [key, item] of Object.entries(value)) {
      const parsed = toJsonValue(item);
      if (parsed !== undefined) record[key] = parsed;
    }
    return record;
  }

  return undefined;
}

function parseMaybeJson(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function formatPayload(value: unknown): string {
  if (typeof value === "string") {
    const parsed = parseMaybeJson(value);
    return typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
  }

  const jsonValue = toJsonValue(value);
  if (jsonValue === undefined) return "";
  return typeof jsonValue === "string" ? jsonValue : JSON.stringify(jsonValue, null, 2);
}

function getJsonRecord(value: unknown): { [key: string]: JsonValue } | null {
  const jsonValue = toJsonValue(value);
  if (!jsonValue || typeof jsonValue !== "object" || Array.isArray(jsonValue)) return null;
  return jsonValue;
}

function getToolOutputRecord(part: ToolCallViewPart): { [key: string]: JsonValue } | null {
  if (part.output !== undefined) return getJsonRecord(part.output);
  return null;
}

function getCreatedResumeOutput(part: ToolCallViewPart): CreatedResumeOutput | null {
  if (!createdResumeToolNames.has(part.name)) return null;

  const output = getToolOutputRecord(part);
  if (!output || typeof output.resumeId !== "string") return null;

  return {
    resumeId: output.resumeId,
    ...(typeof output.name === "string" ? { name: output.name } : {}),
  };
}

function getToolLabel(name: string): string {
  return name
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function CreatedResumeCard({ output }: { output: CreatedResumeOutput }) {
  return (
    <div
      className="mt-3 rounded-lg bg-[color-mix(in_oklch,var(--color-success)_9%,var(--color-base-100))] p-3 text-sm ring-1 ring-[color-mix(in_oklch,var(--color-success)_25%,transparent)]"
      data-test="resume-ai-created-resume-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
          <Box className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{output.name ?? "New resume draft"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Created and ready to review.</p>
        </div>
        <Button asChild size="sm" className="h-8 shrink-0 gap-1.5 rounded-lg">
          <Link
            to="/resumes/$resumeId"
            params={{ resumeId: output.resumeId }}
            search={{ tab: "preview" }}
            data-test="resume-ai-open-created-resume"
          >
            Open
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ToolCallPanel({ part }: { part: ToolCallViewPart }) {
  const createdResume = getCreatedResumeOutput(part);
  const input = formatPayload(part.arguments);
  const output = part.output === undefined ? "" : formatPayload(part.output);

  return (
    <details
      className="group rounded-lg bg-[color-mix(in_oklch,var(--color-base-content)_6%,transparent)] px-3 py-2 text-xs text-muted-foreground"
      data-test="resume-ai-tool-call"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-foreground/80 marker:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-primary" />
          <span className="truncate">{getToolLabel(part.name)}</span>
          <span className="rounded-full bg-base-100 px-2 py-0.5 text-[0.68rem] text-muted-foreground">
            {part.state}
          </span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      {createdResume ? <CreatedResumeCard output={createdResume} /> : null}
      <div className="mt-3 grid gap-2">
        {input ? (
          <div>
            <p className="mb-1 font-medium text-foreground/70">Input</p>
            <pre className="max-h-56 overflow-auto rounded-md bg-base-100 p-2 text-[0.7rem] leading-5 text-foreground">
              {input}
            </pre>
          </div>
        ) : null}
        {output ? (
          <div>
            <p className="mb-1 font-medium text-foreground/70">Output</p>
            <pre className="max-h-56 overflow-auto rounded-md bg-base-100 p-2 text-[0.7rem] leading-5 text-foreground">
              {output}
            </pre>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function ToolResultPanel({ part }: { part: ToolResultViewPart }) {
  const content = formatPayload(part.content);

  return (
    <details
      className="group rounded-lg bg-[color-mix(in_oklch,var(--color-success)_10%,transparent)] px-3 py-2 text-xs text-muted-foreground"
      data-test="resume-ai-tool-result"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-foreground/80 marker:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-success" />
          <span>Tool result</span>
          <span className="rounded-full bg-base-100 px-2 py-0.5 text-[0.68rem] text-muted-foreground">
            {part.state}
          </span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 grid gap-2">
        {part.error ? (
          <p className="rounded-md bg-destructive/10 p-2 text-destructive">{part.error}</p>
        ) : null}
        {content ? (
          <pre className="max-h-56 overflow-auto rounded-md bg-base-100 p-2 text-[0.7rem] leading-5 text-foreground">
            {content}
          </pre>
        ) : null}
      </div>
    </details>
  );
}

function toStoredMessages(messages: UIMessage[]): ResumeAiChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts
      .map((part): ResumeAiChatMessagePart | null => {
        if (part.type === "text") {
          return { type: "text", content: part.content };
        }

        if (part.type === "thinking") {
          return { type: "thinking", content: part.content };
        }

        if (part.type === "tool-call") {
          const output = toJsonValue(part.output);
          return {
            type: "tool-call",
            id: part.id,
            name: part.name,
            arguments: part.arguments,
            state: part.state,
            ...(part.approval === undefined ? {} : { approval: part.approval }),
            ...(output === undefined ? {} : { output }),
          };
        }

        if (part.type === "tool-result") {
          return {
            type: "tool-result",
            toolCallId: part.toolCallId,
            content: part.content,
            state: part.state,
            ...(part.error === undefined ? {} : { error: part.error }),
          };
        }

        return null;
      })
      .filter((part): part is ResumeAiChatMessagePart => part !== null),
  }));
}

function toUiMessages(messages: ResumeAiChatMessage[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts.map((part) => ({ ...part })),
  }));
}

export function ResumeAiTab({ resumeId, jobDescription }: ResumeAiTabProps) {
  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearScope, setClearScope] = useState<"remote" | "both" | null>(null);
  const { settings, saveSettings, clearSettings } = useAiSettings();
  const queryClient = useQueryClient();
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedSignatureRef = useRef("");
  const hydratedHistoryRef = useRef<string | null>(null);
  const handledToolOutputsRef = useRef(new Set<string>());

  const isReady = isLocalMode || !!settings;

  const { data: localChats } = useLiveQuery(
    (q) =>
      q.from({ chat: resumeAiChatCollection }).where(({ chat }) => eq(chat.resumeId, resumeId)),
    [resumeId],
  );
  const localChat = localChats[0];
  const historyQuery = useQuery(resumeAiChatQueryOptions(resumeId));

  const saveChatMutation = useMutation({
    mutationFn: async (messagesToSave: ResumeAiChatDTO["messages"]) =>
      saveResumeAiChat({ data: { resumeId, messages: messagesToSave, model: settings?.model } }),
    onSuccess(chat) {
      void persistLocalResumeAiChat(chat);
      void queryClient.invalidateQueries({ queryKey: resumeAiChatQueryOptions(resumeId).queryKey });
    },
    onError(err: unknown) {
      toast.error("Failed to save chat history", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => clearResumeAiChat({ data: { resumeId } }),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: resumeAiChatQueryOptions(resumeId).queryKey });
    },
    onSettled() {
      setClearScope(null);
    },
  });

  const {
    messages,
    sendMessage,
    clear,
    isLoading,
    error,
    status,
    sessionGenerating,
    stop,
    reload,
    setMessages,
  } = useChat({
    id: `resume-ai-chat-${resumeId}`,
    initialMessages: toUiMessages(localChat?.messages ?? historyQuery.data?.messages ?? []),
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
    let shouldRefreshResumeList = false;

    for (const message of messages) {
      for (const part of message.parts) {
        if (part.type !== "tool-call" || part.output === undefined) continue;
        if (!writeToolNames.has(part.name)) continue;

        const handledKey = `${part.id}:${part.state}`;
        if (handledToolOutputsRef.current.has(handledKey)) continue;
        handledToolOutputsRef.current.add(handledKey);

        const output = getToolOutputRecord(part);
        const outputResumeId =
          output && typeof output.resumeId === "string" ? output.resumeId : resumeId;

        shouldRefreshResumeList = true;
        void queryClient.invalidateQueries({
          queryKey: resumeDetailQueryOptions(outputResumeId).queryKey,
        });
      }
    }

    if (!shouldRefreshResumeList) return;

    void queryClient.invalidateQueries({ queryKey: ["resumes"] });
    void resumeCollection.utils.refetch();
    void resumesCollection.utils.refetch();
  }, [messages, queryClient, resumeId]);

  useEffect(() => {
    const serverChat = historyQuery.data;
    if (!serverChat || hydratedHistoryRef.current === serverChat.updatedAt) return;
    hydratedHistoryRef.current = serverChat.updatedAt;
    void persistLocalResumeAiChat(serverChat);

    if (messages.length === 0 && serverChat.messages.length > 0) {
      setMessages(toUiMessages(serverChat.messages));
      lastSavedSignatureRef.current = JSON.stringify(serverChat.messages);
    }
  }, [historyQuery.data, messages.length, setMessages]);

  useEffect(() => {
    if (messages.length > 0 || !localChat || localChat.messages.length === 0) return;
    setMessages(toUiMessages(localChat.messages));
    lastSavedSignatureRef.current = JSON.stringify(localChat.messages);
  }, [localChat, messages.length, setMessages]);

  useEffect(() => {
    if (isLoading || messages.length === 0) return;
    const storedMessages = toStoredMessages(messages);
    const signature = JSON.stringify(storedMessages);
    if (signature === lastSavedSignatureRef.current) return;
    lastSavedSignatureRef.current = signature;
    saveChatMutation.mutate(storedMessages);
  }, [isLoading, messages, saveChatMutation]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isLoading, status]);

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

  function resetVisibleConversation() {
    clear();
    setInput("");
    lastSavedSignatureRef.current = "";
    hydratedHistoryRef.current = null;
  }

  async function clearRemoteConversation() {
    setClearScope("remote");
    await clearChatMutation.mutateAsync();
  }

  async function clearRemoteAndLocalConversation() {
    setClearScope("both");
    await Promise.all([clearLocalResumeAiChat(resumeId), clearChatMutation.mutateAsync()]);
    resetVisibleConversation();
    setClearDialogOpen(false);
  }

  function handleClearDialogOpenChange(open: boolean) {
    if (clearChatMutation.isPending) return;
    setClearDialogOpen(open);
  }

  function editPastPrompt(message: UIMessage) {
    const text = getMessageText(message);
    if (!text) return;
    setInput(text);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }

  async function resendPastPrompt(message: UIMessage) {
    const text = getMessageText(message);
    if (!text || isLoading || !isReady) return;
    await sendMessage(text);
  }

  const activeModelLabel = settings?.model
    ? (settings.model.split("/").pop() ?? settings.model)
    : null;

  const sessionChars = messages.reduce((total, msg) => {
    const textChars = msg.parts
      .filter((part) => part.type === "text")
      .reduce((sum, part) => sum + (part.type === "text" ? part.content.length : 0), 0);
    return total + textChars;
  }, 0);

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
          <AlertDialog open={clearDialogOpen} onOpenChange={handleClearDialogOpenChange}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                disabled={isLoading || messages.length === 0 || clearChatMutation.isPending}
                className="h-auto rounded-xl px-4 text-muted-foreground hover:text-foreground"
                data-test="resume-ai-clear"
              >
                {clearChatMutation.isPending ? "Clearing..." : "Clear chat"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                <AlertDialogDescription className="leading-6">
                  Choose whether to delete only the synced server copy or delete both the synced
                  copy and this browser's local cached conversation.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={clearChatMutation.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="outline"
                  disabled={clearChatMutation.isPending}
                  onClick={() => void clearRemoteConversation()}
                  data-test="resume-ai-clear-remote"
                >
                  {clearScope === "remote" ? "Clearing..." : "Remote only"}
                </AlertDialogAction>
                <AlertDialogAction
                  variant="destructive"
                  disabled={clearChatMutation.isPending}
                  onClick={() => void clearRemoteAndLocalConversation()}
                  data-test="resume-ai-clear-both"
                >
                  {clearScope === "both" ? "Clearing..." : "Remote and local"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card className="min-h-120 overflow-hidden border-0 bg-[color-mix(in_oklch,var(--color-base-200)_86%,var(--color-base-content)_14%)] shadow-[0_24px_80px_color-mix(in_oklch,var(--color-base-content)_10%,transparent)] ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
        <CardContent className="flex h-full flex-col gap-0 p-0">
          <div className="flex items-center gap-3 border-b border-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)] px-4 py-3 sm:px-5">
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

          <div className="flex min-h-96 flex-col gap-5 overflow-hidden px-4 py-5 sm:px-5">
            {messages.length === 0 && historyQuery.isPending ? (
              <div className="flex h-full flex-1 flex-col gap-4 rounded-2xl bg-base-100/55 px-6 py-8 ring-1 ring-dashed ring-[color-mix(in_oklch,var(--color-base-content)_14%,transparent)]">
                {[80, 60, 95, 50].map((width) => (
                  <div key={width} className="flex items-start gap-3">
                    <div className="size-9 shrink-0 animate-pulse rounded-full bg-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]" />
                    <div className="flex flex-1 flex-col gap-2 pt-1">
                      <div
                        className="h-3 animate-pulse rounded-full bg-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]"
                        style={{ width: `${width}%` }}
                      />
                      <div className="h-3 w-1/2 animate-pulse rounded-full bg-[color-mix(in_oklch,var(--color-base-content)_7%,transparent)]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
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
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p
                          className={cn(
                            "text-[0.68rem] font-semibold uppercase tracking-[0.16em]",
                            role === "user"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {role === "assistant" ? "Assistant" : "You"}
                        </p>
                        {role === "user" ? (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isLoading || !isReady}
                              onClick={() => editPastPrompt(message)}
                              className="size-7 rounded-lg text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                              data-test="resume-ai-edit-past-prompt"
                              title="Edit prompt"
                            >
                              <PencilLine className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isLoading || !isReady}
                              onClick={() => void resendPastPrompt(message)}
                              className="size-7 rounded-lg text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                              data-test="resume-ai-resend-past-prompt"
                              title="Resend prompt"
                            >
                              <RefreshCcw className="size-3.5" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
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
                            return <ToolCallPanel key={index} part={part} />;
                          }
                          if (part.type === "tool-result") {
                            return <ToolResultPanel key={index} part={part} />;
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
                ref={composerRef}
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
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_10%,transparent)] px-3 py-1 text-xs text-muted-foreground">
                  {isLoading || sessionGenerating ? (
                    <LoaderCircle className="size-3 animate-spin text-primary" />
                  ) : (
                    <span className="size-2 rounded-full bg-primary" />
                  )}
                  {getChatStatusLabel(status, isLoading, sessionGenerating)}
                </div>
                {((activeModelLabel && !isLocalMode) || settings?.apiKey) && (
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
                    {saveChatMutation.isPending && (
                      <>
                        <span className="text-primary/30">·</span>
                        <span>Saving history</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && !isLoading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void reload()}
                    disabled={!isReady}
                    className="h-9 gap-1.5 rounded-xl text-xs"
                    data-test="resume-ai-regenerate"
                  >
                    <RefreshCcw className="size-3.5" />
                    Regenerate
                  </Button>
                )}
                {isLoading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={stop}
                    className="h-9 gap-1.5 rounded-xl text-xs text-muted-foreground"
                    data-test="resume-ai-stop"
                  >
                    <Square className="size-3.5 fill-current" />
                    Stop
                  </Button>
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
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
