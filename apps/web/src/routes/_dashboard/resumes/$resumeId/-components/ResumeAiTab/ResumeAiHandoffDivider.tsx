import { ArrowLeftRight, ArrowRight } from "lucide-react";

/** Marks where the dashboard assistant handed the conversation to this one. */
export function ResumeAiHandoffDivider({ context }: { context: string }) {
  return (
    <div
      role="separator"
      aria-label="Context handed over from the dashboard assistant"
      title={context}
      className="flex w-full items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground"
      data-test="resume-ai-handoff-divider"
    >
      <ArrowLeftRight className="size-3.5 shrink-0" />
      <span>Context handoff</span>
      <span className="font-medium text-primary">Dashboard assistant</span>
      <ArrowRight className="size-3 shrink-0" />
      <span className="font-medium text-base-content/80">Résumé assistant</span>
    </div>
  );
}
