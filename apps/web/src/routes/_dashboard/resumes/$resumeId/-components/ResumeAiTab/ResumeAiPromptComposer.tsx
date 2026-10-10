import { PromptArea } from "@/components/prompt-area/prompt-area";
import { commandTrigger, mentionTrigger } from "@/components/prompt-area/trigger-presets";
import type { PromptAreaHandle } from "@/components/prompt-area/types";
import type { ChipSegment, Segment } from "@/components/prompt-area/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { resumeListQueryOptions } from "@/data-access-layer/resume/resume-query-options";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUp, FileText, LoaderCircle, Plus, Square } from "lucide-react";
import { useState, type RefObject } from "react";
import { CreditsDisplay } from "./ResumeAiCredits";
import { DIRECTIVES, directiveByCommand } from "./resume-ai-directives";

export interface ResumeAiPromptComposerProps {
  activeModelLabel: string | null;
  activeRoutingLabel: string | null;
  apiKey: string | null;
  currentResumeId: string;
  errorMessage: string | null;
  isBusy: boolean;
  isReady: boolean;
  onOpenSettings: () => void;
  onSend: (message: string) => void | Promise<void>;
  onStop: () => void;
  promptAreaRef: RefObject<PromptAreaHandle | null>;
  sessionChars: number;
  sessionGenerating: boolean;
  status: string;
}

export function ResumeAiPromptComposer({
  activeModelLabel,
  activeRoutingLabel,
  apiKey,
  currentResumeId,
  errorMessage,
  isBusy,
  isReady,
  onOpenSettings,
  onSend,
  onStop,
  promptAreaRef,
  sessionChars,
  sessionGenerating,
  status,
}: ResumeAiPromptComposerProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const { data: resumes } = useSuspenseQuery(resumeListQueryOptions);
  const otherResumes = resumes.filter((resume) => resume.id !== currentResumeId);
  const referencedIds = segments
    .filter((segment): segment is ChipSegment => segment.type === "chip" && segment.trigger === "@")
    .map((chip) => chip.value);

  function insertMention(resume: { id: string; name: string }) {
    promptAreaRef.current?.insertChip({
      trigger: "@",
      value: resume.id,
      displayText: `@${resume.name}`,
      data: { id: resume.id, name: resume.name },
    });
    setAttachOpen(false);
    promptAreaRef.current?.focus();
  }

  function handleSend(nextSegments: Segment[]) {
    const message = serializeSegments(nextSegments);
    if (!message || isBusy || !isReady) return;
    const result = onSend(message);
    setSegments([]);
    promptAreaRef.current?.focus();
    return result;
  }

  return (
    <div className="mx-auto w-full max-w-3xl" data-test="resume-ai-composer">
      {errorMessage ? (
        <p
          className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          data-test="resume-ai-error"
        >
          {errorMessage}
        </p>
      ) : null}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await handleSend(segments);
        }}
        className="flex flex-col gap-2"
        data-test="resume-ai-composer-form"
      >
        <div
          className="overflow-hidden rounded-2xl border border-base-content/15 bg-primary/10 text-base-content shadow-sm"
          data-test="resume-ai-input-shell"
        >
          <PromptArea
            ref={promptAreaRef}
            value={segments}
            onChange={setSegments}
            onSubmit={handleSend}
            placeholder={
              isReady
                ? [
                    "Ask for a fit analysis, a rewritten summary, better bullets, or a tailored draft...",
                    "Type / for directives, @ to reference another resume...",
                  ]
                : "Configure your OpenRouter API key in settings to start chatting..."
            }
            disabled={!isReady || isBusy}
            triggers={[
              commandTrigger({
                position: "start",
                emptyMessage: "No matching directive",
                chipClassName: "bg-primary/15 text-primary",
                onSearch: (query) =>
                  DIRECTIVES.filter(
                    (directive) =>
                      directive.command.includes(query.toLowerCase()) ||
                      directive.label.toLowerCase().includes(query.toLowerCase()),
                  ).map((directive) => ({
                    value: directive.command,
                    label: directive.command,
                    description: directive.label,
                  })),
              }),
              mentionTrigger({
                emptyMessage: "No other resumes",
                onSearch: (query) =>
                  otherResumes
                    .filter((resume) => resume.name.toLowerCase().includes(query.toLowerCase()))
                    .map((resume) => ({
                      value: resume.id,
                      label: resume.name,
                      description: resume.headline ?? undefined,
                      data: { id: resume.id, name: resume.name },
                    })),
              }),
            ]}
            className="min-h-16 max-h-72 px-4 pt-3 pb-2 text-base"
            aria-label="Ask the resume AI"
            data-test-id="resume-ai-input"
          />
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
              </button>
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
                disabled={!hasText(segments) || isBusy || !isReady}
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
      <AttachResumeSheet
        open={attachOpen}
        onOpenChange={setAttachOpen}
        resumes={otherResumes}
        referencedIds={referencedIds}
        onSelect={insertMention}
      />
    </div>
  );
}

/** True when the segments contain any non-whitespace text or chip. */
function hasText(segments: Segment[]) {
  return segments.some((segment) => segment.type === "chip" || segment.text.trim().length > 0);
}

/**
 * Serialize segments into the outgoing prompt. Text and chips render inline
 * (chips as their display text); directive chips append their instruction block
 * and mention chips append the referenced-resume id mapping.
 */
function serializeSegments(segments: Segment[]) {
  const inline = segments
    .map((segment) => (segment.type === "text" ? segment.text : segment.displayText))
    .join("")
    .trim();
  if (!inline) return "";

  const directiveChips = segments.filter(isDirectiveChip);
  const mentionChips = segments.filter(
    (segment): segment is ChipSegment => segment.type === "chip" && segment.trigger === "@",
  );

  const parts = [inline];

  const directiveLines = directiveChips
    .map((chip) => directiveByCommand(chip.value))
    .filter((directive): directive is NonNullable<typeof directive> => Boolean(directive))
    .map((directive) => `${directive.command}: ${directive.instruction}`);
  if (directiveLines.length > 0) parts.push(directiveLines.join("\n"));

  const mentionLines = mentionChips.map((chip) => {
    const data = chip.data as { id?: string; name?: string } | undefined;
    const name = data?.name ?? chip.displayText;
    const id = data?.id ?? chip.value;
    return `- "${name}" (id: ${id})`;
  });
  if (mentionLines.length > 0) parts.push(`Referenced resumes:\n${mentionLines.join("\n")}`);

  return parts.join("\n\n");
}

function isDirectiveChip(segment: Segment): segment is ChipSegment {
  return segment.type === "chip" && segment.trigger === "/";
}

interface ResumeOption {
  id: string;
  name: string;
  headline: string;
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

function getChatStatusLabel(status: string, isLoading: boolean, sessionGenerating: boolean) {
  if (status === "submitted") return "Request sent";
  if (status === "streaming") return "Streaming response";
  if (sessionGenerating) return "Generating";
  if (isLoading) return "Working";
  if (status === "error") return "Needs attention";
  return "Ready";
}
