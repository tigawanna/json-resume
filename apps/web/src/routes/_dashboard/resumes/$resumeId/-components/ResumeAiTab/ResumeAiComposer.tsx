import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUp, FileText, Plus, Square, X } from "lucide-react";
import { useState, type KeyboardEvent, type RefObject } from "react";
import { resumeListQueryOptions } from "@/data-access-layer/resume/resume-query-options";

export interface AttachedResume {
  id: string;
  name: string;
}

export interface ResumeAiComposerProps {
  composerRef: RefObject<HTMLTextAreaElement | null>;
  currentResumeId: string;
  errorMessage: string | null;
  input: string;
  isBusy: boolean;
  isReady: boolean;
  onInputChange: (value: string) => void;
  onSend: (message: string, attachments: AttachedResume[]) => void | Promise<void>;
  onStop: () => void;
}

export function ResumeAiComposer({
  composerRef,
  currentResumeId,
  errorMessage,
  input,
  isBusy,
  isReady,
  onInputChange,
  onSend,
  onStop,
}: ResumeAiComposerProps) {
  const [attachOpen, setAttachOpen] = useState(false);
  const [attached, setAttached] = useState<AttachedResume[]>([]);

  function toggleAttached(resume: AttachedResume) {
    setAttached((current) =>
      current.some((item) => item.id === resume.id)
        ? current.filter((item) => item.id !== resume.id)
        : [...current, resume],
    );
  }

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || isBusy || !isReady) return;
    const message = attached.length
      ? `${trimmed}\n\nAttached resumes:\n${attached
          .map((resume) => `- "${resume.name}" (id: ${resume.id})`)
          .join("\n")}`
      : trimmed;
    await onSend(message, attached);
    setAttached([]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void send();
  }

  return (
    <>
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
        {attached.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5" data-test="resume-ai-attachments">
            {attached.map((resume) => (
              <span
                key={resume.id}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-primary/20"
              >
                <FileText className="size-3" />
                {resume.name}
                <button
                  type="button"
                  aria-label={`Remove ${resume.name}`}
                  className="rounded-sm p-0.5 transition-colors hover:bg-primary/15"
                  onClick={() => toggleAttached(resume)}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div
          className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-base-content/15 bg-base-200 shadow-sm"
          data-test="resume-ai-input-shell"
        >
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
            className="field-sizing-content max-h-72 min-h-16 w-full resize-none border-0 bg-base-200 px-4 pt-3 pb-2 text-base shadow-none focus-visible:ring-0 dark:bg-base-200"
            data-test="resume-ai-input"
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label="Attach context"
              disabled={!isReady}
              onClick={() => setAttachOpen(true)}
              data-test="resume-ai-attach"
            >
              <Plus className="size-4" />
            </Button>
            <div className="flex items-center gap-1">
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
      <AttachResumeSheet
        open={attachOpen}
        onOpenChange={setAttachOpen}
        currentResumeId={currentResumeId}
        attached={attached}
        onToggleAttached={toggleAttached}
      />
    </>
  );
}

function AttachResumeSheet({
  open,
  onOpenChange,
  currentResumeId,
  attached,
  onToggleAttached,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentResumeId: string;
  attached: AttachedResume[];
  onToggleAttached: (resume: AttachedResume) => void;
}) {
  const { data: resumes } = useSuspenseQuery(resumeListQueryOptions);
  const otherResumes = resumes.filter((resume) => resume.id !== currentResumeId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader className="p-4">
          <SheetTitle>Attach context</SheetTitle>
          <SheetDescription>
            Attach other résumés so the assistant can reference them in this chat.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-1 overflow-y-auto p-2">
          {otherResumes.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No other résumés yet.
            </p>
          ) : (
            otherResumes.map((resume) => {
              const isAttached = attached.some((item) => item.id === resume.id);
              return (
                <button
                  key={resume.id}
                  type="button"
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-base-100"
                  onClick={() => onToggleAttached({ id: resume.id, name: resume.name })}
                  data-test={`resume-ai-attach-option-${resume.id}`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                      isAttached
                        ? "bg-primary/15 text-primary"
                        : "bg-base-100 text-muted-foreground"
                    }`}
                  >
                    {isAttached ? <X className="size-4" /> : <FileText className="size-4" />}
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
