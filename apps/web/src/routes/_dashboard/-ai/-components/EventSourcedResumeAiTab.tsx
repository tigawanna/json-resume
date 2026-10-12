import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { ResumeAiConversationCard } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiConversationCard";
import { useEffect, useRef, useState } from "react";
import { usePanelRef } from "react-resizable-panels";
import { useEventSourcedResumeAiChat } from "../-hooks/use-event-sourced-resume-ai";
import { useResumeAiPreviewPanel } from "../-hooks/use-resume-ai-preview-panel";
import { isApiKeyErrorMessage } from "../-utils/is-api-key-error";
import { EventSourcedAiChrome } from "./EventSourcedAiChrome";
import { ResumeAiLivePreview } from "./ResumeAiLivePreview";
import { ToolApprovalCard } from "./ToolApprovalCard";

export function EventSourcedResumeAiTab({ resumeId }: { resumeId: string }) {
  const chat = useEventSourcedResumeAiChat(resumeId);
  const preview = useResumeAiPreviewPanel({ messages: chat.messages, isLoading: chat.isLoading });
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const split = isDesktop && preview.open;
  const chatPanelRef = usePanelRef();
  const previewPanelRef = usePanelRef();
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const endOfMessagesRef = chat.endOfMessagesRef;
  const tabRef = useRef<HTMLDivElement>(null);
  const messageCount = chat.messages.length;

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ block: "end" });
    tabRef.current?.scrollIntoView({ block: "end" });
  }, [split, messageCount, endOfMessagesRef]);

  function closePreview() {
    setChatCollapsed(false);
    setPreviewCollapsed(false);
    preview.close();
  }

  function togglePreview() {
    if (preview.open) closePreview();
    else preview.show();
  }

  return (
    <div
      ref={tabRef}
      className={cn("mx-auto flex w-full flex-col gap-3", split ? "max-w-none" : "max-w-6xl")}
      data-test="event-sourced-resume-ai-tab"
    >
      <EventSourcedAiChrome
        activeModelLabel={chat.activeModelLabel}
        activeRoutingLabel={chat.activeRoutingLabel}
        apiKeyRejected={isApiKeyErrorMessage(chat.chatErrorMessage)}
        clearDialogOpen={chat.clearDialogOpen}
        hasMessages={chat.messages.length > 0}
        isBusy={chat.isLoading}
        isCustomSystemPrompt={chat.isCustomSystemPrompt}
        isReady={chat.isReady}
        previewOpen={preview.open}
        settings={chat.settings}
        settingsOpen={chat.settingsOpen}
        systemPrompt={chat.systemPrompt}
        onClearChat={chat.clearLocalConversation}
        onClearDialogOpenChange={chat.handleClearDialogOpenChange}
        onClearSettings={chat.clearSettings}
        onOpenSettings={() => chat.setSettingsOpen(true)}
        onResetSystemPrompt={chat.resetSystemPrompt}
        onSaveSettings={chat.saveSettings}
        onSaveSystemPrompt={chat.saveSystemPrompt}
        onSettingsOpenChange={chat.setSettingsOpen}
        onTogglePreview={togglePreview}
      />

      <ResizablePanelGroup
        orientation="horizontal"
        className={cn("min-h-112", split && "rounded-xl border border-border/60")}
        style={{ height: "calc(100dvh - 8.75rem)" }}
        data-test="resume-ai-split"
      >
        <ResizablePanel
          id="chat"
          panelRef={chatPanelRef}
          collapsible={split}
          collapsedSize={0}
          minSize={split ? "30%" : undefined}
          onResize={() => setChatCollapsed(chatPanelRef.current?.isCollapsed() ?? false)}
        >
          <div className={cn("h-full", split && "px-3")}>
            <ResumeAiConversationCard
              activeModelLabel={chat.activeModelLabel}
              activeResume={chat.activeResume}
              activeRoutingLabel={chat.activeRoutingLabel}
              apiKey={chat.settings?.apiKey ?? null}
              onResetActiveResume={chat.resetActiveResume}
              sessionChars={chat.sessionChars}
              sessionGenerating={chat.sessionGenerating}
              status={chat.status}
              onOpenSettings={() => chat.setSettingsOpen(true)}
              promptAreaRef={chat.composerRef}
              createdResumeTo="/resumes/$resumeId"
              currentResumeId={resumeId}
              endOfMessagesRef={chat.endOfMessagesRef}
              errorMessage={chat.chatErrorMessage}
              historyPending={false}
              isBusy={chat.isLoading}
              isReady={chat.isReady}
              messages={chat.messages}
              onEditPastPrompt={chat.editPastPrompt}
              onResendPastPrompt={(message) => void chat.resendPastPrompt(message)}
              onSend={(message) => void chat.sendText(message)}
              onStop={chat.stop}
            />
          </div>
        </ResizablePanel>
        {split ? (
          <>
            <ResizableHandle withHandle data-test="resume-ai-split-handle" />
            <ResizablePanel
              id="preview"
              panelRef={previewPanelRef}
              defaultSize="45%"
              minSize="25%"
              collapsible
              collapsedSize="44px"
              onResize={() => setPreviewCollapsed(previewPanelRef.current?.isCollapsed() ?? false)}
            >
              <ResumeAiLivePreview
                resumeId={chat.activeResume.id}
                layout={previewCollapsed ? "rail" : chatCollapsed ? "maximized" : "panel"}
                onMinimize={() => previewPanelRef.current?.collapse()}
                onRestore={() => {
                  if (previewCollapsed) previewPanelRef.current?.expand();
                  else chatPanelRef.current?.expand();
                }}
                onMaximize={() => chatPanelRef.current?.collapse()}
                onClose={closePreview}
              />
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>

      <Sheet
        open={preview.open && !isDesktop}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="h-[85dvh] gap-0 p-0"
          data-test="resume-ai-preview-sheet"
        >
          <SheetTitle className="sr-only">Résumé preview</SheetTitle>
          <ResumeAiLivePreview
            resumeId={chat.activeResume.id}
            layout="sheet"
            onMinimize={closePreview}
            onRestore={closePreview}
            onMaximize={closePreview}
            onClose={closePreview}
          />
        </SheetContent>
      </Sheet>

      <ToolApprovalCard approvals={chat.approvals} resuming={chat.approvalsResuming} />
    </div>
  );
}
