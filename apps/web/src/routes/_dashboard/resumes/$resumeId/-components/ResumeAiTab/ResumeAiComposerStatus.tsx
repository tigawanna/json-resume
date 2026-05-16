import type { AiSettings } from "@/types/ai-settings";
import { ChevronsUpDown, LoaderCircle } from "lucide-react";
import { CreditsDisplay } from "./ResumeAiCredits";
import { isLocalMode } from "./resume-ai-types";

interface ComposerStatusProps {
  activeModelLabel: string | null;
  isBusy: boolean;
  onOpenSettings: () => void;
  savePending: boolean;
  sessionChars: number;
  sessionGenerating: boolean;
  settings: AiSettings | null;
  status: string;
}

export function ResumeAiComposerStatus({
  activeModelLabel,
  isBusy,
  onOpenSettings,
  savePending,
  sessionChars,
  sessionGenerating,
  settings,
  status,
}: ComposerStatusProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_10%,transparent)] px-3 py-1 text-xs text-muted-foreground">
        {isBusy || sessionGenerating ? (
          <LoaderCircle className="size-3 animate-spin text-primary" />
        ) : (
          <span className="size-2 rounded-full bg-primary" />
        )}
        {getChatStatusLabel(status, isBusy, sessionGenerating)}
      </div>
      {((activeModelLabel && !isLocalMode) || settings?.apiKey) && (
        <div className="flex flex-wrap items-center gap-2 rounded-full bg-[color-mix(in_oklch,var(--color-primary)_7%,transparent)] px-2 py-1 ring-1 ring-[color-mix(in_oklch,var(--color-primary)_18%,transparent)]">
          {activeModelLabel && !isLocalMode ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronsUpDown className="size-3 text-primary/60" />
              {activeModelLabel}
            </button>
          ) : null}
          {activeModelLabel && !isLocalMode && settings?.apiKey ? (
            <span className="text-primary/30">·</span>
          ) : null}
          {settings?.apiKey ? (
            <CreditsDisplay apiKey={settings.apiKey} sessionChars={sessionChars} />
          ) : null}
          {savePending ? (
            <>
              <span className="text-primary/30">·</span>
              <span>Saving history</span>
            </>
          ) : null}
        </div>
      )}
    </div>
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
