import { Badge } from "@/components/ui/badge";
import { aiModelLabels } from "@/lib/openrouter/model-labels";
import { EventSourcedAiSettingsSheet } from "@/routes/_dashboard/-ai/-components/EventSourcedAiSettingsSheet";
import { useEventSourcedAiSettings } from "@/routes/_dashboard/-ai/-hooks/use-event-sourced-ai-settings";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Sparkles } from "lucide-react";
import { SettingsSection } from "./SettingsSection";

const AI_SETTINGS_HASH = "ai";

export function AiAssistantSection() {
  const { settings } = useEventSourcedAiSettings();
  const hash = useLocation({ select: (location) => location.hash });
  const navigate = useNavigate();
  const open = hash === AI_SETTINGS_HASH;
  const connected = Boolean(settings);
  const { modelLabel, routingLabel } = aiModelLabels(settings);

  function setOpen(next: boolean) {
    void navigate({
      to: "/settings",
      hash: next ? AI_SETTINGS_HASH : undefined,
      replace: true,
      resetScroll: false,
    });
  }

  return (
    <>
      <SettingsSection
        id="ai"
        icon={Sparkles}
        title="AI assistants"
        description="One setup for the dashboard assistant and the résumé editor."
        testId="settings-ai-section"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hover:bg-base-100 focus-visible:ring-ring/50 flex w-full items-center gap-2 rounded-lg border bg-base-100 px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-[3px]"
          aria-label="Open AI settings"
          data-test="settings-ai-open"
        >
          {connected ? (
            <span className="grid min-w-0 flex-1 grid-cols-2 gap-4">
              <span className="min-w-0">
                <span className="text-muted-foreground block text-xs">Model</span>
                <span className="mt-0.5 block truncate text-sm font-medium">
                  {modelLabel ?? "—"}
                </span>
              </span>
              <span className="min-w-0">
                <span className="text-muted-foreground block text-xs">Provider</span>
                <span className="mt-0.5 block truncate text-sm font-medium">
                  {routingLabel ?? "—"}
                </span>
              </span>
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate text-sm">
              Add an OpenRouter key and pick a model
            </span>
          )}
          <Badge variant={connected ? "secondary" : "outline"} className="shrink-0">
            {connected ? "Connected" : "Not set up"}
          </Badge>
          <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
        </button>
      </SettingsSection>
      <EventSourcedAiSettingsSheet open={open} apiKeyRejected={false} onOpenChange={setOpen} />
    </>
  );
}
