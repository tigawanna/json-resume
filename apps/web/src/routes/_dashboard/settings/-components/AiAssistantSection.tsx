import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventSourcedAiSettingsSheet } from "@/routes/_dashboard/-ai/-components/EventSourcedAiSettingsSheet";
import { useEventSourcedAiSettings } from "@/routes/_dashboard/-ai/-hooks/use-event-sourced-ai-settings";
import { isLocalMode } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/resume-ai-types";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

const AI_SETTINGS_HASH = "ai";

export function AiAssistantSection() {
  const { settings } = useEventSourcedAiSettings();
  const hash = useLocation({ select: (location) => location.hash });
  const navigate = useNavigate();
  const open = hash === AI_SETTINGS_HASH;
  const connected = isLocalMode || Boolean(settings);
  const summary = isLocalMode
    ? "Using LM Studio"
    : (settings?.model ?? "Add an OpenRouter key and pick a model");

  function setOpen(next: boolean) {
    void navigate({
      to: "/settings",
      hash: next ? AI_SETTINGS_HASH : undefined,
      replace: true,
      resetScroll: false,
    });
  }

  return (
    <Card id="ai" className="scroll-mt-20" data-test="settings-ai-section">
      <CardHeader>
        <CardTitle>AI assistants</CardTitle>
        <CardDescription>
          Shared by the dashboard assistant and the résumé editor's assistant.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hover:bg-muted/60 focus-visible:ring-ring/50 flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-[3px]"
          aria-label="Open AI settings"
          data-test="settings-ai-open"
        >
          <span className="min-w-0 flex-1 truncate text-sm">{summary}</span>
          <Badge variant={connected ? "secondary" : "outline"} className="shrink-0">
            {connected ? "Connected" : "Not set up"}
          </Badge>
          <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
        </button>
      </CardContent>
      <EventSourcedAiSettingsSheet open={open} apiKeyRejected={false} onOpenChange={setOpen} />
    </Card>
  );
}
