import { KeyRound, Settings, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiSettings } from "@/types/ai-settings";

interface AiSettingsPanelProps {
  settings: AiSettings | null;
  onOpenSettings: () => void;
}

export function AiSettingsPanel({ settings, onOpenSettings }: AiSettingsPanelProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[color-mix(in_oklch,var(--color-base-200)_84%,var(--color-base-content)_8%)] px-4 py-2.5 ring-1 ring-[color-mix(in_oklch,var(--color-base-content)_10%,transparent)]">
      <div className="flex items-center gap-2 text-sm">
        <Settings className="size-4 text-muted-foreground" />
        {settings ? (
          <>
            <span className="text-muted-foreground">Provider</span>
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
              Configured
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              · {settings.model}
            </span>
          </>
        ) : (
          <>
            <TriangleAlert className="size-3.5 text-destructive" />
            <span className="text-sm text-destructive">API key required</span>
          </>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onOpenSettings}
        className="gap-1.5 rounded-lg text-xs"
      >
        <KeyRound className="size-3.5" />
        {settings ? "Change" : "Configure"}
      </Button>
    </div>
  );
}
