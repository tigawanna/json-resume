import { AiProviderModal } from "@/features/agentic-tools/AiProviderModal";
import { AiSettingsPanel } from "@/features/agentic-tools/AiSettingsPanel";
import type { AiSettings } from "@/types/ai-settings";
import { isLocalMode } from "./resume-ai-types";

interface ResumeAiProviderSettingsProps {
  clearSettings: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saveSettings: (settings: AiSettings) => void;
  settings: AiSettings | null;
}

export function ResumeAiProviderSettings({
  clearSettings,
  open,
  onOpenChange,
  saveSettings,
  settings,
}: ResumeAiProviderSettingsProps) {
  if (isLocalMode) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-[color-mix(in_oklch,var(--color-base-200)_84%,var(--color-primary)_16%)] px-4 py-2.5 text-sm text-muted-foreground ring-1 ring-[color-mix(in_oklch,var(--color-primary)_22%,transparent)]">
        <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
          Local mode
        </span>
        Using LM Studio. No API key required.
      </div>
    );
  }

  return (
    <>
      <AiSettingsPanel settings={settings} onOpenSettings={() => onOpenChange(true)} />
      <AiProviderModal
        open={open}
        onOpenChange={onOpenChange}
        settings={settings}
        onSave={saveSettings}
        onClear={clearSettings}
      />
    </>
  );
}
