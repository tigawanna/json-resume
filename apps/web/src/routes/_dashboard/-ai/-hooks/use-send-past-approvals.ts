import { useEffect, useRef } from "react";

interface ApprovalAwareChat {
  interrupts: ReadonlyArray<unknown>;
  isLoading: boolean;
  resolveInterrupts: (approved: boolean) => void;
  sendMessage: (content: string) => Promise<void>;
}

/**
 * `sendMessage` throws while a tool approval is pending. Sending anyway declines
 * the approval and sends the message once the declined run settles, so a stale
 * approval can never lock the chat.
 */
export function useSendPastApprovals(chat: ApprovalAwareChat) {
  const deferredRef = useRef<string | null>(null);
  const pendingApprovals = chat.interrupts.length;
  const { isLoading } = chat;

  useEffect(() => {
    const text = deferredRef.current;
    if (text === null || isLoading || pendingApprovals > 0) return;
    deferredRef.current = null;
    void chat.sendMessage(text);
  }, [chat, isLoading, pendingApprovals]);

  async function send(text: string) {
    if (chat.interrupts.length > 0) {
      deferredRef.current = text;
      chat.resolveInterrupts(false);
      return;
    }
    await chat.sendMessage(text);
  }

  return { awaitingApproval: pendingApprovals > 0, send };
}
