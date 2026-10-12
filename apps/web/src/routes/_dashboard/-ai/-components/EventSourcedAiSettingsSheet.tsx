import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AiSettingsForm } from "./AiSettingsForm";

interface EventSourcedAiSettingsSheetProps {
  open: boolean;
  apiKeyRejected: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventSourcedAiSettingsSheet({
  open,
  apiKeyRejected,
  onOpenChange,
}: EventSourcedAiSettingsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-xl lg:max-w-2xl"
        data-test="event-sourced-ai-settings-sheet"
      >
        <SheetHeader className="border-border/60 border-b px-6 py-4">
          <SheetTitle>AI settings</SheetTitle>
          <SheetDescription>
            Key, model, provider routing, and system prompt, shared by every assistant. Stored in
            the local database and synced when sync is on.
          </SheetDescription>
        </SheetHeader>
        <AiSettingsForm
          apiKeyRejected={apiKeyRejected}
          bodyClassName="min-h-0 flex-1 overflow-y-auto px-6 py-5"
          footerClassName="border-border/60 border-t px-6 py-4"
          onSaved={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
