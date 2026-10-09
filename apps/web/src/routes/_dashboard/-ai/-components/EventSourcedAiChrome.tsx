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
import type { AiSettings } from "@/types/ai-settings";
import { Settings, Trash2 } from "lucide-react";
import { EventSourcedAiSettingsSheet } from "./EventSourcedAiSettingsSheet";

interface EventSourcedAiChromeProps {
  activeModelLabel: string | null;
  activeRoutingLabel: string | null;
  clearDialogOpen: boolean;
  hasMessages: boolean;
  isBusy: boolean;
  isCustomSystemPrompt: boolean;
  isReady: boolean;
  settings: AiSettings | null;
  settingsOpen: boolean;
  systemPrompt: string;
  onClearChat: () => void;
  onClearDialogOpenChange: (open: boolean) => void;
  onClearSettings: () => void;
  onOpenSettings: () => void;
  onResetSystemPrompt: () => void;
  onSaveSettings: (settings: AiSettings) => void;
  onSaveSystemPrompt: (value: string) => void;
  onSettingsOpenChange: (open: boolean) => void;
}

export function EventSourcedAiChrome({
  clearDialogOpen,
  hasMessages,
  isBusy,
  isCustomSystemPrompt,
  isReady,
  settings,
  settingsOpen,
  systemPrompt,
  onClearChat,
  onClearDialogOpenChange,
  onClearSettings,
  onOpenSettings,
  onResetSystemPrompt,
  onSaveSettings,
  onSaveSystemPrompt,
  onSettingsOpenChange,
}: EventSourcedAiChromeProps) {
  return (
    <>
      <div className="flex items-center justify-end gap-1" data-test="event-sourced-ai-chrome">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={onOpenSettings}
          aria-label="AI settings"
          data-test="event-sourced-ai-settings"
        >
          <Settings className="size-4" />
        </Button>
        <AlertDialog open={clearDialogOpen} onOpenChange={onClearDialogOpenChange}>
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
        settings={settings}
        systemPrompt={systemPrompt}
        isCustomSystemPrompt={isCustomSystemPrompt}
        onOpenChange={onSettingsOpenChange}
        onClearSettings={onClearSettings}
        onSaveSettings={onSaveSettings}
        onSaveSystemPrompt={onSaveSystemPrompt}
        onResetSystemPrompt={onResetSystemPrompt}
      />
    </>
  );
}
