import { ResumeAiConversationCard } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiConversationCard";
import { useEventSourcedResumeAiChat } from "../-hooks/use-event-sourced-resume-ai";
import { EventSourcedAiChrome } from "./EventSourcedAiChrome";
import { ToolApprovalCard } from "./ToolApprovalCard";

export function EventSourcedResumeAiTab({ resumeId }: { resumeId: string }) {
  const chat = useEventSourcedResumeAiChat(resumeId);

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-3"
      data-test="event-sourced-resume-ai-tab"
    >
      <EventSourcedAiChrome
        activeModelLabel={chat.activeModelLabel}
        activeRoutingLabel={chat.activeRoutingLabel}
        clearDialogOpen={chat.clearDialogOpen}
        hasMessages={chat.messages.length > 0}
        isBusy={chat.isLoading}
        isCustomSystemPrompt={chat.isCustomSystemPrompt}
        isReady={chat.isReady}
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
      />

      <ResumeAiConversationCard
        composerRef={chat.composerRef}
        createdResumeTo="/resumes/$resumeId"
        currentResumeId={resumeId}
        endOfMessagesRef={chat.endOfMessagesRef}
        errorMessage={chat.chatErrorMessage}
        historyPending={false}
        input={chat.input}
        isBusy={chat.isLoading}
        isReady={chat.isReady}
        messages={chat.messages}
        onEditPastPrompt={chat.editPastPrompt}
        onInputChange={chat.setInput}
        onResendPastPrompt={(message) => void chat.resendPastPrompt(message)}
        onSend={(message) => void chat.sendText(message)}
        onStop={chat.stop}
      />

      <ToolApprovalCard approvals={chat.approvals} resuming={chat.approvalsResuming} />
    </div>
  );
}
