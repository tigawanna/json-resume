import { Textarea } from "@/components/ui/textarea";
import type { AiSettings } from "@/types/ai-settings";
import type { FormEvent, KeyboardEvent, RefObject } from "react";
import { ResumeAiComposerActions } from "./ResumeAiComposerActions";
import { ResumeAiComposerStatus } from "./ResumeAiComposerStatus";

export interface ResumeAiComposerProps {
  activeModelLabel: string | null;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  errorMessage: string | null;
  input: string;
  isBusy: boolean;
  isReady: boolean;
  messagesCount: number;
  onInputChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onOpenSettings: () => void;
  onRegenerate: () => void;
  onStop: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  savePending: boolean;
  sessionChars: number;
  sessionGenerating: boolean;
  settings: AiSettings | null;
  status: string;
}

export function ResumeAiComposer({
  activeModelLabel,
  composerRef,
  errorMessage,
  input,
  isBusy,
  isReady,
  messagesCount,
  onInputChange,
  onKeyDown,
  onOpenSettings,
  onRegenerate,
  onStop,
  onSubmit,
  savePending,
  sessionChars,
  sessionGenerating,
  settings,
  status,
}: ResumeAiComposerProps) {
  return (
    <>
      {errorMessage ? (
        <p
          className="mx-4 mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-5"
          data-test="resume-ai-error"
        >
          {errorMessage}
        </p>
      ) : null}
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 border-t border-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)] bg-base-100/55 p-4 sm:p-5"
      >
        <div className="rounded-2xl bg-base-200 shadow-inner ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
          <Textarea
            ref={composerRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              isReady
                ? "Ask for a fit analysis, a rewritten summary, better bullets, or a tailored draft..."
                : "Configure your API key above to start chatting..."
            }
            rows={3}
            disabled={isBusy || !isReady}
            className="min-h-24 resize-none border-0 bg-transparent p-4 shadow-none focus-visible:ring-0"
            data-test="resume-ai-input"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ResumeAiComposerStatus
            activeModelLabel={activeModelLabel}
            isBusy={isBusy}
            onOpenSettings={onOpenSettings}
            savePending={savePending}
            sessionChars={sessionChars}
            sessionGenerating={sessionGenerating}
            settings={settings}
            status={status}
          />
          <ResumeAiComposerActions
            canSubmit={!!input.trim() && !isBusy && isReady}
            hasMessages={messagesCount > 0}
            isBusy={isBusy}
            isReady={isReady}
            onRegenerate={onRegenerate}
            onStop={onStop}
          />
        </div>
      </form>
    </>
  );
}
