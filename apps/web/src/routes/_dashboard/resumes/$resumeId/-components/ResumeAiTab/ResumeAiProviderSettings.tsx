import { AiProviderModal } from "@/features/agentic-tools/AiProviderModal";
import { AiSettingsPanel } from "@/features/agentic-tools/AiSettingsPanel";
import type { AiSettings } from "@/types/ai-settings";

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
