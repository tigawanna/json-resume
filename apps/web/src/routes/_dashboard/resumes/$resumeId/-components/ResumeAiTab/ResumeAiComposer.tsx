import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { resumeListQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUp,
  ChevronsUpDown,
  FileText,
  LoaderCircle,
  Plus,
  Square,
  X,
} from "lucide-react";
import { useState, type KeyboardEvent, type RefObject } from "react";
import { CreditsDisplay } from "./ResumeAiCredits";

interface ResumeOption {
  id: string;
  name: string;
  headline: string;
}

export interface ResumeAiComposerProps {
  activeModelLabel: string | null;
  activeRoutingLabel: string | null;
  apiKey: string | null;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  currentResumeId: string;
  errorMessage: string | null;
  input: string;
  isBusy: boolean;
  isReady: boolean;
  onInputChange: (value: string) => void;
  onOpenSettings: () => void;
  onSend: (message: string) => void | Promise<void>;
  onStop: () => void;
  attachedDirectives?: string[];
  onRemoveDirective?: (command: string) => void;
  sessionChars: number;
  sessionGenerating: boolean;
  status: string;
}

export function ResumeAiComposer({
  activeModelLabel,
  activeRoutingLabel,
  apiKey,
  composerRef,
  currentResumeId,
  errorMessage,
  input,
  isBusy,
  isReady,
  onInputChange,
  onOpenSettings,
  onSend,
  onStop,
  attachedDirectives,
  onRemoveDirective,
  sessionChars,
  sessionGenerating,
  status,
}: ResumeAiComposerProps) {
  const [attachOpen, setAttachOpen] = useState(false);
  const { data: resumes } = useSuspenseQuery(resumeListQueryOptions);
  const otherResumes = resumes.filter((resume) => resume.id !== currentResumeId);
  const referenced = otherResumes.filter((resume) => input.includes(mentionOf(resume.name)));

  function insertMention(resume: ResumeOption) {
    const token = `${mentionOf(resume.name)} `;
    const start = composerRef.current?.selectionStart ?? input.length;
    const end = composerRef.current?.selectionEnd ?? input.length;
    const before = input.slice(0, start);
    onInputChange(before + token + input.slice(end));
    setAttachOpen(false);
    const caret = before.length + token.length;
    window.setTimeout(() => {
      composerRef.current?.focus();
      composerRef.current?.setSelectionRange(caret, caret);
    }, 0);
  }

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || isBusy || !isReady) return;
    const message = referenced.length
      ? `${trimmed}\n\nReferenced resumes:\n${referenced
          .map((resume) => `- "${resume.name}" (id: ${resume.id})`)
          .join("\n")}`
      : trimmed;
    await onSend(message);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void send();
  }

  return (
    <>
      <div className="mx-auto w-full max-w-3xl ">
        {errorMessage ? (
          <p
            className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            data-test="resume-ai-error"
          >
            {errorMessage}
          </p>
        ) : null}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
          className="flex flex-col gap-2"
          data-test="resume-ai-composer"
        >
          <div
            className="overflow-hidden rounded-2xl border border-base-content/15 bg-primary/10 text-base-content shadow-sm"
            data-test="resume-ai-input-shell"
          >
            {attachedDirectives && attachedDirectives.length > 0 ? (
              <div
                className="flex flex-wrap gap-1.5 px-3 pt-3"
                data-test="resume-ai-attached-directives"
              >
                {attachedDirectives.map((command) => (
                  <span
                    key={command}
                    className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 py-0.5 pl-2.5 pr-1 text-xs font-medium text-primary"
                    data-test={`resume-ai-attached-directive-${command.slice(1)}`}
                  >
                    {command}
                    {onRemoveDirective ? (
                      <button
                        type="button"
                        aria-label={`Remove directive ${command}`}
                        onClick={() => onRemoveDirective(command)}
                        className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
                        data-test={`resume-ai-remove-directive-${command.slice(1)}`}
                      >
                        <X className="size-3" />
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="relative">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden px-4 pt-3 pb-2 text-base wrap-break-word whitespace-pre-wrap md:text-base"
              >
                <MentionHighlight text={`${input} `} names={referenced.map((r) => r.name)} />
              </div>
              <Textarea
                ref={composerRef}
                value={input}
                onChange={(event) => onInputChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isReady
                    ? "Ask for a fit analysis, a rewritten summary, better bullets, or a tailored draft..."
                    : "Configure your OpenRouter API key in settings to start chatting..."
                }
                rows={2}
                disabled={isBusy || !isReady}
                className="field-sizing-content relative max-h-72 min-h-16 w-full resize-none border-0 bg-transparent px-4 pt-3 pb-2 text-base text-transparent caret-base-content shadow-none focus-visible:ring-0 md:text-base dark:bg-transparent"
                data-test="resume-ai-input"
              />
            </div>
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="flex min-w-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground shrink-0"
                  aria-label="Attach context"
                  disabled={!isReady}
                  onClick={() => setAttachOpen(true)}
                  data-test="resume-ai-attach"
                >
                  <Plus className="size-4" />
                </Button>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors"
                  data-test="resume-ai-model-selector"
                >
                  <span className="truncate font-medium">
                    {activeModelLabel ?? (isReady ? "Default model" : "Set up a model")}
                  </span>
                  {activeRoutingLabel ? (
                    <span className="truncate opacity-70">· {activeRoutingLabel}</span>
                  ) : null}
                  <ChevronsUpDown className="size-3 shrink-0 opacity-60" />
                </button>
                {errorMessage ? (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    title={`${errorMessage} - open AI settings`}
                    aria-label="Error. Open AI settings"
                    className="text-destructive hover:bg-destructive/10 flex shrink-0 items-center rounded-md p-1 transition-colors"
                    data-test="resume-ai-error-indicator"
                  >
                    <AlertTriangle className="size-4" />
                  </button>
                ) : null}
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
                    data-test="resume-ai-stop"
                  >
                    <Square className="size-3.5" />
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  size="icon-sm"
                  aria-label="Send message"
                  disabled={!input.trim() || isBusy || !isReady}
                  data-test="resume-ai-send"
                >
                  <ArrowUp className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </form>
        {isBusy || sessionGenerating || apiKey ? (
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-xs text-muted-foreground"
            data-test="resume-ai-status"
          >
            {isBusy || sessionGenerating ? (
              <span className="flex items-center gap-1.5">
                <LoaderCircle className="size-3 animate-spin text-primary" />
                {getChatStatusLabel(status, isBusy, sessionGenerating)}
              </span>
            ) : null}
            {apiKey ? (
              <CreditsDisplay
                apiKey={apiKey}
                sessionChars={sessionChars}
                onOpenSettings={onOpenSettings}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      <AttachResumeSheet
        open={attachOpen}
        onOpenChange={setAttachOpen}
        resumes={otherResumes}
        referencedIds={referenced.map((r) => r.id)}
        onSelect={insertMention}
      />
    </>
  );
}

function getChatStatusLabel(status: string, isLoading: boolean, sessionGenerating: boolean) {
  if (status === "submitted") return "Request sent";
  if (status === "streaming") return "Streaming response";
  if (sessionGenerating) return "Generating";
  if (isLoading) return "Working";
  if (status === "error") return "Needs attention";
  return "Ready";
}

function mentionOf(name: string) {
  return `@${name}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function MentionHighlight({ text, names }: { text: string; names: string[] }) {
  if (names.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${names.map((name) => escapeRegExp(mentionOf(name))).join("|")})`);
  return (
    <>
      {text.split(pattern).map((part, index) =>
        names.some((name) => mentionOf(name) === part) ? (
          <span key={index} className="rounded-sm bg-primary/10">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

function AttachResumeSheet({
  open,
  onOpenChange,
  resumes,
  referencedIds,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: ResumeOption[];
  referencedIds: string[];
  onSelect: (resume: ResumeOption) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader className="p-4">
          <SheetTitle>Reference resumes</SheetTitle>
          <SheetDescription>
            Pick a résumé to insert it into your message as a reference.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-1 overflow-y-auto p-2">
          {resumes.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No other résumés yet.
            </p>
          ) : (
            resumes.map((resume) => {
              const isReferenced = referencedIds.includes(resume.id);
              return (
                <button
                  key={resume.id}
                  type="button"
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-base-100"
                  onClick={() => onSelect(resume)}
                  data-test={`resume-ai-attach-option-${resume.id}`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                      isReferenced
                        ? "bg-primary/15 text-primary"
                        : "bg-base-100 text-muted-foreground"
                    }`}
                  >
                    <FileText className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{resume.name}</span>
                    {resume.headline ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {resume.headline}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
