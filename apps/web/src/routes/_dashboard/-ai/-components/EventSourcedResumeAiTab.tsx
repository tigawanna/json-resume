import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { ResumeAiConversationCard } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiConversationCard";
import { useResumeWorkbenchActions } from "@/routes/_dashboard/resumes/$resumeId/-components/resume-workbench/ResumeWorkbenchProvider";
import { useState } from "react";
import { usePanelRef } from "react-resizable-panels";
import { useEventSourcedResumeAiChat } from "../-hooks/use-event-sourced-resume-ai";
import { useResumeAiPreviewPanel } from "../-hooks/use-resume-ai-preview-panel";
import { isApiKeyErrorMessage } from "@/lib/openrouter/is-api-key-error";
import { EventSourcedAiChrome } from "./EventSourcedAiChrome";
import { ResumeAiLivePreview } from "./ResumeAiLivePreview";

export function EventSourcedResumeAiTab(props?: {
  /** Dev chat lab: scripted endpoint and the preset the next send should play. */
  lab?: { connection: string; preset: string };
}) {
  const chat = useEventSourcedResumeAiChat(
    props?.lab ? { connection: props.lab.connection, labPreset: props.lab.preset } : undefined,
  );
  const previewOpen = useResumeAiPreviewPanel({
    messages: chat.messages,
    isLoading: chat.isLoading,
  });
  const workbench = useResumeWorkbenchActions();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const split = isDesktop && previewOpen;
  const chatPanelRef = usePanelRef();
  const previewPanelRef = usePanelRef();
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  function closePreview() {
    setChatCollapsed(false);
    setPreviewCollapsed(false);
    workbench.closePreview();
  }

  function togglePreview() {
    if (previewOpen) closePreview();
    else workbench.showPreview();
  }

  const labError =
    props?.lab && isApiKeyErrorMessage(chat.chatErrorMessage) ? null : chat.chatErrorMessage;

  let previewLayout: "rail" | "maximized" | "panel" = "panel";
  if (previewCollapsed) previewLayout = "rail";
  else if (chatCollapsed) previewLayout = "maximized";

  return (
    <div className="flex h-full min-h-0 w-full flex-col" data-test="event-sourced-resume-ai-tab">
      <EventSourcedAiChrome
        apiKeyRejected={props?.lab ? false : isApiKeyErrorMessage(chat.chatErrorMessage)}
        hasMessages={chat.messages.length > 0}
        isBusy={chat.isLoading}
        onClearChat={chat.clearLocalConversation}
        onTogglePreview={togglePreview}
      />

      <ResizablePanelGroup
        orientation="horizontal"
        className={cn("min-h-0 flex-1", split && "border-t border-border/60")}
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
              chat={chat.chat}
              activeModelLabel={chat.activeModelLabel}
              activeResume={chat.activeResume}
              activeRoutingLabel={chat.activeRoutingLabel}
              apiKey={chat.settings?.apiKey ?? null}
              awaitingApproval={chat.awaitingApproval}
              sessionChars={chat.sessionChars}
              sessionGenerating={chat.sessionGenerating}
              status={chat.status}
              promptAreaRef={chat.composerRef}
              endOfMessagesRef={chat.endOfMessagesRef}
              errorMessage={labError}
              historyPending={false}
              isBusy={chat.isLoading}
              isReady={chat.isReady}
              onEditPastPrompt={chat.editPastPrompt}
              onResendPastPrompt={(message) => void chat.resendPastPrompt(message)}
              onSend={(message) => void chat.sendText(message)}
              onRetry={chat.retryLastRun}
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
                layout={previewLayout}
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
        open={previewOpen && !isDesktop}
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
            layout="sheet"
            onMinimize={closePreview}
            onRestore={closePreview}
            onMaximize={closePreview}
            onClose={closePreview}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
