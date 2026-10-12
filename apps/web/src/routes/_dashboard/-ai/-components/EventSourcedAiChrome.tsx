import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  useResumeWorkbench,
  useResumeWorkbenchActions,
} from "@/routes/_dashboard/resumes/$resumeId/-components/resume-workbench/ResumeWorkbenchProvider";
import { FileText, Settings, Trash2 } from "lucide-react";
import { useEventSourcedAiSettings } from "../-hooks/use-event-sourced-ai-settings";
import { EventSourcedAiSettingsSheet } from "./EventSourcedAiSettingsSheet";

interface EventSourcedAiChromeProps {
  apiKeyRejected: boolean;
  hasMessages: boolean;
  isBusy: boolean;
  onClearChat: () => void;
  onTogglePreview: () => void;
}

export function EventSourcedAiChrome({
  apiKeyRejected,
  hasMessages,
  isBusy,
  onClearChat,
  onTogglePreview,
}: EventSourcedAiChromeProps) {
  const previewOpen = useResumeWorkbench((state) => state.ai.previewOpen);
  const settingsOpen = useResumeWorkbench((state) => state.dialog === "ai-settings");
  const { openDialog, setDialogOpen } = useResumeWorkbenchActions();
  const aiSettings = useEventSourcedAiSettings();

  return (
    <>
      <div className="flex items-center justify-end gap-1" data-test="event-sourced-ai-chrome">
        <Button
          type="button"
          variant={previewOpen ? "secondary" : "ghost"}
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={onTogglePreview}
          aria-pressed={previewOpen}
          data-test="resume-ai-preview-toggle"
        >
          <FileText className="size-4" />
          Preview
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => openDialog("ai-settings")}
          aria-label="AI settings"
          data-test="event-sourced-ai-settings"
        >
          <Settings className="size-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isBusy || !hasMessages}
              className="text-muted-foreground"
              aria-label="Clear chat"
              data-test="resume-ai-clear"
            >
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the conversation stored in the local database for this résumé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel size="sm" variant="outline">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction variant="destructive" size="sm" onClick={onClearChat}>
                Clear this chat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <EventSourcedAiSettingsSheet
        open={settingsOpen}
        apiKeyRejected={apiKeyRejected}
        settings={aiSettings.settings}
        systemPrompt={aiSettings.systemPrompt}
        isCustomSystemPrompt={aiSettings.isCustomSystemPrompt}
        slopGuard={aiSettings.slopGuard}
        onSaveSlopGuard={aiSettings.saveSlopGuard}
        onOpenChange={(open) => setDialogOpen("ai-settings", open)}
        onClearSettings={aiSettings.clearSettings}
        onSaveSettings={aiSettings.saveSettings}
        onSaveSystemPrompt={aiSettings.saveSystemPrompt}
        onResetSystemPrompt={aiSettings.resetSystemPrompt}
      />
    </>
  );
}
