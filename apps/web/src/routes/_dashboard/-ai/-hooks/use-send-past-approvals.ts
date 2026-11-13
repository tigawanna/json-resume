import { useEffect, useState, useRef } from "react";

interface ApprovalAwareChat {
  interrupts: ReadonlyArray<unknown>;
  isLoading: boolean;
  resolveInterrupts: (approved: boolean) => void;
  sendMessage: (content: string) => Promise<void>;
  /** Drops a run locally, including interrupts the published list no longer shows. */
  stop: () => void;
}

/**
 * `sendMessage` throws while a tool approval is pending. Sending anyway declines
 * the approval and sends the message once the declined run settles, so a stale
 * approval can never lock the chat.
 *
 * A dropped stream can leave interrupt descriptors that the published list hides
 * (client-tool and in-flight submissions). Those still reject `sendMessage`.
 * `stalled` is that lock, and `releaseStuckRun` clears it with `stop()`.
 */
export function useSendPastApprovals(chat: ApprovalAwareChat) {
  const deferredRef = useRef<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const pendingApprovals = chat.interrupts.length;
  const { isLoading } = chat;

  useEffect(() => {
    const text = deferredRef.current;
    if (text === null || isLoading || pendingApprovals > 0) return;
    deferredRef.current = null;
    void chat.sendMessage(text).catch((error: unknown) => {
      if (!isPendingInterruptError(error)) throw error;
      setStalled(true);
    });
  }, [chat, isLoading, pendingApprovals]);

  async function send(text: string) {
    if (chat.interrupts.length > 0) {
      deferredRef.current = text;
      chat.resolveInterrupts(false);
      return true;
    }
    try {
      await chat.sendMessage(text);
      setStalled(false);
      return true;
    } catch (error: unknown) {
      if (!isPendingInterruptError(error)) throw error;
      setStalled(true);
      return false;
    }
  }

  function releaseStuckRun() {
    chat.stop();
    deferredRef.current = null;
    setStalled(false);
  }

  return { awaitingApproval: pendingApprovals > 0, releaseStuckRun, send, stalled };
}

function isPendingInterruptError(error: unknown) {
  return error instanceof Error && error.message.includes("pending interrupts exist");
}
