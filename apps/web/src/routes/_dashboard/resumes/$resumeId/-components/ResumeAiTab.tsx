import { ResumeAiConversationCard } from "./ResumeAiTab/ResumeAiConversationCard";
import { ResumeAiPromptsCard } from "./ResumeAiTab/ResumeAiPromptsCard";
import { ResumeAiProviderSettings } from "./ResumeAiTab/ResumeAiProviderSettings";
import type { ResumeAiTabProps } from "./ResumeAiTab/resume-ai-types";
import { useResumeAiChat } from "./ResumeAiTab/useResumeAiChat";

export function ResumeAiTab(props: ResumeAiTabProps) {
  const chat = useResumeAiChat(props);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4" data-test="resume-ai-tab">
      <ResumeAiProviderSettings
        clearSettings={chat.clearSettings}
        open={chat.settingsOpen}
        onOpenChange={chat.setSettingsOpen}
        saveSettings={chat.saveSettings}
        settings={chat.settings}
      />

      <ResumeAiPromptsCard
        clearDialogOpen={chat.clearDialogOpen}
        clearScope={chat.clearScope}
        hasJobDescription={!!props.jobDescription.trim()}
        hasMessages={chat.messages.length > 0}
        isBusy={chat.isLoading}
        isClearPending={chat.clearChatMutation.isPending}
        isReady={chat.isReady}
        onClearBoth={() => void chat.clearRemoteAndLocalConversation()}
        onClearDialogOpenChange={chat.handleClearDialogOpenChange}
        onClearRemote={() => void chat.clearRemoteConversation()}
        onSendStarter={(message) => void chat.sendStarter(message)}
      />

      <ResumeAiConversationCard
        activeModelLabel={chat.activeModelLabel}
        composerRef={chat.composerRef}
        endOfMessagesRef={chat.endOfMessagesRef}
        errorMessage={chat.chatErrorMessage}
        historyPending={chat.historyPending}
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
        savePending={chat.saveChatMutation.isPending}
        sessionChars={chat.sessionChars}
        sessionGenerating={chat.sessionGenerating}
        settings={chat.settings}
        status={chat.status}
      />
    </div>
  );
}
