import { Button } from "@/components/ui/button";
import { ArrowUp, LoaderCircle, RefreshCcw, Square } from "lucide-react";

interface ResumeAiComposerActionsProps {
  canSubmit: boolean;
  hasMessages: boolean;
  isBusy: boolean;
  isReady: boolean;
  onRegenerate: () => void;
  onStop: () => void;
}

export function ResumeAiComposerActions({
  canSubmit,
  hasMessages,
  isBusy,
  isReady,
  onRegenerate,
  onStop,
}: ResumeAiComposerActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {hasMessages && !isBusy ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          disabled={!isReady}
          className="h-9 gap-1.5 rounded-xl text-xs"
          data-test="resume-ai-regenerate"
        >
          <RefreshCcw className="size-3.5" />
          Regenerate
        </Button>
      ) : null}
      {isBusy ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onStop}
          className="h-9 gap-1.5 rounded-xl text-xs text-muted-foreground"
          data-test="resume-ai-stop"
        >
          <Square className="size-3.5 fill-current" />
          Stop
        </Button>
      ) : null}
      <Button
        type="submit"
        disabled={!canSubmit}
        className="min-w-32 rounded-xl"
        data-test="resume-ai-submit"
      >
        {isBusy ? (
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
  );
}
