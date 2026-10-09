import { ResumeAiConversationCard } from "@/routes/_dashboard/resumes/$resumeId/-components/ResumeAiTab/ResumeAiConversationCard";
import { useEventSourcedResumeAiChat } from "../-hooks/use-event-sourced-resume-ai";
import { EventSourcedAiChrome } from "./EventSourcedAiChrome";
import { ToolApprovalCard } from "./ToolApprovalCard";

export function EventSourcedResumeAiTab({
  resumeId,
  jobDescription,
}: {
  resumeId: string;
  jobDescription: string;
}) {
  const chat = useEventSourcedResumeAiChat(resumeId);

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-3"
      data-test="event-sourced-resume-ai-tab"
    >
      <EventSourcedAiChrome
        activeModelLabel={chat.activeModelLabel}
        clearDialogOpen={chat.clearDialogOpen}
        hasJobDescription={!!jobDescription.trim()}
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
        onSendStarter={(message) => void chat.sendStarter(message)}
        onSettingsOpenChange={chat.setSettingsOpen}
      />

      <ResumeAiConversationCard
        activeModelLabel={chat.activeModelLabel}
        composerRef={chat.composerRef}
        createdResumeTo="/resumes/$resumeId"
        endOfMessagesRef={chat.endOfMessagesRef}
        errorMessage={chat.chatErrorMessage}
        historyPending={false}
        input={chat.input}
        isBusy={chat.isLoading}
        isReady={chat.isReady}
        messages={chat.messages}
        onEditPastPrompt={chat.editPastPrompt}
        onInputChange={chat.setInput}
        onKeyDown={chat.handleComposerKeyDown}
        onOpenSettings={() => chat.setSettingsOpen(true)}
        onRegenerate={() => void chat.reload()}
        onResendPastPrompt={(message) => void chat.resendPastPrompt(message)}
        onStop={chat.stop}
        onSubmit={chat.handleSubmit}
        savePending={false}
        sessionChars={chat.sessionChars}
        sessionGenerating={chat.sessionGenerating}
        settings={chat.settings}
        status={chat.status}
      />

      <ToolApprovalCard approvals={chat.approvals} resuming={chat.approvalsResuming} />
    </div>
  );
}
